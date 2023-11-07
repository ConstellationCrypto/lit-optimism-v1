/* eslint-disable @typescript-eslint/no-unused-vars */
import { env } from 'process'

import {
  ethers,
  Contract,
  Overrides,
  Signer,
  BigNumber,
  CallOverrides,
  Bytes,
} from 'ethers'
import {
  TransactionRequest,
  TransactionResponse,
  BlockTag,
} from '@ethersproject/abstract-provider'
import { getContractInterface, predeploys } from '@constellation-labs/contracts'
import { Address, hexStringEquals } from '@constellation-labs/core-utils'

import {
  IBridgeAdapter,
  ICrossChainMessenger,
  NumberLike,
  AddressLike,
  NFTBridgeMessage,
  MessageDirection,
} from '../interfaces'
import { toAddress, omit, CONTRACT_ADDRESSES } from '../utils'
import queryFilter from '../utils/query-filter'

/**
 * Bridge adapter for any token bridge that uses the standard token bridge interface.
 */
export class NFTBridgeAdapter implements IBridgeAdapter {
  public messenger: ICrossChainMessenger
  public l1Bridge: Contract
  public l2Bridge: Contract

  /**
   * Creates a NFTBridgeAdapter instance.
   *
   * @param opts Options for the adapter.
   * @param opts.messenger Provider used to make queries related to cross-chain interactions.
   * @param opts.l1Bridge L1 bridge contract.
   * @param opts.l2Bridge L2 bridge contract.
   */
  constructor(opts: {
    messenger: ICrossChainMessenger
    l1Bridge: AddressLike
    l2Bridge: AddressLike
  }) {
    this.messenger = opts.messenger
    this.l1Bridge = new Contract(
      toAddress(opts.l1Bridge),
      getContractInterface('L1ERC721Bridge'),
      this.messenger.l1Provider
    )
    this.l2Bridge = new Contract(
      toAddress(opts.l2Bridge),
      getContractInterface('IL2ERC721Bridge'),
      this.messenger.l2Provider
    )
  }

  public async getDepositsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag
      toBlock?: BlockTag
    }
  ): Promise<NFTBridgeMessage[]> {
    const events = await queryFilter(
      this.l1Bridge,
      this.l1Bridge.filters.ERC721BridgeInitiated(
        undefined,
        undefined,
        address
      ),
      opts?.fromBlock,
      opts?.toBlock,
      this.messenger.getLogsProvider
    )

    return events
      .map((event) => {
        return {
          direction: MessageDirection.L1_TO_L2,
          from: event.args.from,
          to: event.args.to,
          l1Token: event.args.localToken,
          l2Token: event.args.remoteToken,
          extraData: event.args.extraData,
          tokenId: event.args.tokenId,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      })
      .sort((a, b) => {
        // Sort descending by block number
        return b.blockNumber - a.blockNumber
      })
  }

  public async getWithdrawalsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag
      toBlock?: BlockTag
    }
  ): Promise<NFTBridgeMessage[]> {
    const events = await this.l2Bridge.queryFilter(
      this.l2Bridge.filters.ERC721BridgeInitiated(
        undefined,
        undefined,
        address
      ),
      opts?.fromBlock,
      opts?.toBlock
    )

    return events
      .map((event) => {
        return {
          direction: MessageDirection.L2_TO_L1,
          from: event.args.from,
          to: event.args.to,
          l1Token: event.args.localToken,
          l2Token: event.args.remoteToken,
          extraData: event.args.extraData,
          tokenId: event.args.tokenId,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }
      })
      .sort((a, b) => {
        // Sort descending by block number
        return b.blockNumber - a.blockNumber
      })
  }

  public async supportsTokenPair(
    l1Token: AddressLike,
    l2Token: AddressLike
  ): Promise<boolean> {
    try {
      const contract = new Contract(
        toAddress(l2Token),
        getContractInterface('OptimismMintableERC721'),
        this.messenger.l2Provider
      )

      // Don't support ETH deposits or withdrawals via this bridge
      if (
        hexStringEquals(toAddress(l1Token), ethers.constants.AddressZero) ||
        hexStringEquals(toAddress(l2Token), predeploys.OVM_ETH)
      ) {
        return false
      }

      // Don't support ERC-20 deposits or withdrawals via this bridge
      if (
        ethers.utils.formatUnits(
          await this.messenger.l2Provider.getBalance(toAddress(l2Token))
        ) === '0x0'
      ) {
        return false
      }

      // Make sure the L1 token matches
      const remoteL1Token = await contract.remoteToken()
      if (!hexStringEquals(remoteL1Token, toAddress(l1Token))) {
        return false
      }

      // Make sure the L2 bridge matches
      const remoteL2Bridge = await contract.bridge()
      if (!hexStringEquals(remoteL2Bridge, this.l2Bridge.address)) {
        return false
      }

      return true
    } catch (err) {
      // If there is an exception, assume the token is not supported (not OptimismMintableERC721)
      // Other errors are thrown
      if (err.message.toString().includes('CALL_EXCEPTION')) {
        return false
      } else {
        throw err
      }
    }
  }

  public async approve(
    l1Token: AddressLike,
    l2Token: AddressLike,
    signer: Signer,
    TOKEN_ID: NumberLike,
    opts?: {
      overrides?: Overrides
    }
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.approve(l1Token, l2Token, TOKEN_ID, opts)
    )
  }

  public async deposit(
    l1Token: AddressLike,
    l2Token: AddressLike,
    signer: Signer,
    TOKEN_ID: NumberLike,
    opts?: {
      recipient?: AddressLike
      l2GasLimit?: NumberLike
      extra_data?: String
      overrides?: Overrides
    }
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.deposit(l1Token, l2Token, TOKEN_ID, opts)
    )
  }

  public async withdraw(
    l1Token: AddressLike,
    l2Token: AddressLike,
    signer: Signer,
    TOKEN_ID: NumberLike,
    opts?: {
      recipient?: AddressLike
      extra_data?: String
      overrides?: Overrides
    }
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.withdraw(
        (l1Token = l1Token),
        (l2Token = l2Token),
        TOKEN_ID,
        opts
      )
    )
  }

  populateTransaction = {
    approve: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        overrides?: Overrides
      }
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`)
      }

      const token = new Contract(
        toAddress(l1Token),
        getContractInterface('OptimismMintableERC721'),
        this.messenger.l1Provider
      )

      return token.populateTransaction.approve(
        this.l1Bridge.address,
        TOKEN_ID,
        opts?.overrides || {}
      )
    },

    deposit: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        recipient?: AddressLike
        l2GasLimit?: NumberLike
        extra_data?: String
        overrides?: Overrides
      }
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`)
      }

      if (opts?.recipient === undefined) {
        return this.l1Bridge.populateTransaction.bridgeERC721(
          toAddress(l1Token),
          toAddress(l2Token),
          TOKEN_ID,
          opts?.l2GasLimit || 200_000, // Default to 200k gas limit.
          opts?.extra_data || '0x',
          opts?.overrides || {}
        )
      } else {
        return this.l1Bridge.populateTransaction.bridgeERC721To(
          toAddress(l1Token),
          toAddress(l2Token),
          toAddress(opts.recipient),
          TOKEN_ID,
          opts?.l2GasLimit || 200_000, // Default to 200k gas limit.
          opts?.extra_data || '0x',
          opts?.overrides || {}
        )
      }
    },

    withdraw: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        recipient?: AddressLike
        extra_data?: String
        overrides?: Overrides
      }
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`)
      }

      if (opts?.recipient === undefined) {
        return this.l2Bridge.populateTransaction.bridgeERC721(
          toAddress(l2Token),
          toAddress(l1Token),
          TOKEN_ID,
          0, // L1 gas not required.
          opts?.extra_data || '0x',
          opts?.overrides || {}
        )
      } else {
        return this.l2Bridge.populateTransaction.bridgeERC721To(
          toAddress(l2Token),
          toAddress(l1Token),
          toAddress(opts.recipient),
          TOKEN_ID,
          0, // L1 gas not required.
          opts?.extra_data || '0x',
          opts?.overrides || {}
        )
      }
    },
  }

  estimateGas = {
    approve: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        overrides?: CallOverrides
      }
    ): Promise<BigNumber> => {
      return this.messenger.l1Provider.estimateGas(
        await this.populateTransaction.approve(l1Token, l2Token, TOKEN_ID, opts)
      )
    },

    deposit: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        extra_data?: String
        overrides?: CallOverrides
      }
    ): Promise<BigNumber> => {
      return this.messenger.l1Provider.estimateGas(
        await this.populateTransaction.deposit(l1Token, l2Token, TOKEN_ID, opts)
      )
    },

    withdraw: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      TOKEN_ID: NumberLike,
      opts?: {
        recipient?: AddressLike
        extra_data?: String
        overrides?: CallOverrides
      }
    ): Promise<BigNumber> => {
      return this.messenger.l2Provider.estimateGas(
        await this.populateTransaction.withdraw(
          l1Token,
          l2Token,
          TOKEN_ID,
          opts
        )
      )
    },
  }
}
