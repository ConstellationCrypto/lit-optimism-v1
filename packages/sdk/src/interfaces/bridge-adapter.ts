import { Contract, Overrides, Signer, BigNumber, CallOverrides } from 'ethers'
import {
  TransactionRequest,
  TransactionResponse,
  BlockTag,
} from '@ethersproject/abstract-provider'

import { NumberLike, AddressLike, BridgeMessage } from './types'
import { ICrossChainMessenger } from './cross-chain-messenger'

/**
 * Represents an adapter for an L1<>L2 token bridge. Each custom bridge currently needs its own
 * adapter because the bridge interface is not standardized. This may change in the future.
 */
export interface IBridgeAdapter {
  /**
   * Provider used to make queries related to cross-chain interactions.
   */
  messenger: ICrossChainMessenger

  /**
   * L1 bridge contract.
   */
  l1Bridge: Contract

  /**
   * L2 bridge contract.
   */
  l2Bridge: Contract

  /**
   * Gets all deposits for a given address.
   *
   * @param address Address to search for messages from.
   * @param opts Options object.
   * @param opts.fromBlock Block to start searching for messages from. If not provided, will start
   * from the first block (block #0).
   * @param opts.toBlock Block to stop searching for messages at. If not provided, will stop at the
   * latest known block ("latest").
   * @returns All deposit token bridge messages sent by the given address.
   */
  getDepositsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag
      toBlock?: BlockTag
    }
  ): Promise<BridgeMessage[]>

  /**
   * Gets all withdrawals for a given address.
   *
   * @param address Address to search for messages from.
   * @param opts Options object.
   * @param opts.fromBlock Block to start searching for messages from. If not provided, will start
   * from the first block (block #0).
   * @param opts.toBlock Block to stop searching for messages at. If not provided, will stop at the
   * latest known block ("latest").
   * @returns All withdrawal token bridge messages sent by the given address.
   */
  getWithdrawalsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag
      toBlock?: BlockTag
    }
  ): Promise<BridgeMessage[]>

  /**
   * Checks whether the given token pair is supported by the bridge.
   *
   * @param l1Token The L1 token address.
   * @param l2Token The L2 token address.
   * @returns Whether the given token pair is supported by the bridge.
   */
  supportsTokenPair(
    l1Token: AddressLike,
    l2Token: AddressLike
  ): Promise<boolean>

  /**
   * Queries the account's approval amount for a given L1 token.
   * Made optional to allow for NFT bridge.
   *
   * @param l1Token The L1 token address.
   * @param l2Token The L2 token address.
   * @param signer Signer to query the approval for.
   * @returns Amount of tokens approved for deposits from the account.
   */
  approval?(
    l1Token: AddressLike,
    l2Token: AddressLike,
    signer: Signer
  ): Promise<BigNumber>

  /**
   * Approves a deposit of default (ETH or ERC20) tokens into the L2 chain.
   *
   * @param l1Token The L1 token address.
   * @param l2Token The L2 token address.
   * @param amount Amount of the token to approve.
   * @param TOKEN_ID Token ID for NFTs.
   * @param signer Signer used to sign and send the transaction.
   * @param opts Additional options.
   * @param opts.overrides Optional transaction overrides.
   * @returns Transaction response for the approval transaction.
   */
  approve:
    | ((
        l1Token: AddressLike,
        l2Token: AddressLike,
        amount: NumberLike,
        signer: Signer,
        opts?: {
          overrides?: Overrides
        }
      ) => Promise<TransactionResponse>)
    | ((
        l1Token: AddressLike,
        l2Token: AddressLike,
        signer: Signer,
        TOKEN_ID?: NumberLike,
        opts?: {
          overrides?: Overrides
        }
      ) => Promise<TransactionResponse>)

  /**
   * Deposits some default (ETH or ERC20) tokens into the L2 chain.
   *
   * @param l1Token The L1 token address.
   * @param l2Token The L2 token address.
   * @param amount Amount of the token to deposit.
   * @param TOKEN_ID Token ID.
   * @param signer Signer used to sign and send the transaction.
   * @param opts Additional options.
   * @param opts.recipient Optional address to receive the funds on L2. Defaults to sender.
   * @param opts.l2GasLimit Optional gas limit to use for the transaction on L2.
   * @param opts.overrides Optional transaction overrides.
   * @returns Transaction response for the deposit transaction.
   */
  deposit:
    | ((
        l1Token: AddressLike,
        l2Token: AddressLike,
        amount: NumberLike,
        signer: Signer,
        opts?: {
          recipient?: AddressLike
          l2GasLimit?: NumberLike
          overrides?: Overrides
        }
      ) => Promise<TransactionResponse>)
    | ((
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
      ) => Promise<TransactionResponse>)

  /**
   * Withdraws some default (ETH or ERC20) tokens back to the L1 chain.
   *
   * @param l1Token The L1 token address.
   * @param l2Token The L2 token address.
   * @param amount Amount of the token to withdraw.
   * @param signer Signer used to sign and send the transaction.
   * @param opts Additional options.
   * @param opts.recipient Optional address to receive the funds on L1. Defaults to sender.
   * @param opts.overrides Optional transaction overrides.
   * @returns Transaction response for the withdraw transaction.
   */
  withdraw:
    | ((
        l1Token: AddressLike,
        l2Token: AddressLike,
        amount: NumberLike,
        signer: Signer,
        opts?: {
          recipient?: AddressLike
          overrides?: Overrides
        }
      ) => Promise<TransactionResponse>)
    | ((
        l1Token: AddressLike,
        l2Token: AddressLike,
        signer: Signer,
        TOKEN_ID: NumberLike,
        opts?: {
          recipient?: AddressLike
          extra_data?: String
          overrides?: Overrides
        }
      ) => Promise<TransactionResponse>)

  /**
   * Object that holds the functions that generate transactions to be signed by the user.
   * Follows the pattern used by ethers.js.
   */
  populateTransaction: {
    /**
     * Generates a transaction for approving some default (ETH or ERC20) tokens into the L2 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to approve.
     * @param TOKEN_ID Token ID for NFTs.
     * @param opts Additional options.
     * @param opts.overrides Optional transaction overrides.
     * @returns Transaction that can be signed and executed to deposit the tokens.
     */
    approve:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID: NumberLike,
          opts?: {
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)

    /**
     * Generates a transaction for depositing some default (ETH or ERC20) tokens into the L2 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to deposit.
     * @param opts Additional options.
     * @param opts.recipient Optional address to receive the funds on L2. Defaults to sender.
     * @param opts.l2GasLimit Optional gas limit to use for the transaction on L2.
     * @param opts.overrides Optional transaction overrides.
     * @returns Transaction that can be signed and executed to deposit the tokens.
     */
    deposit:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            recipient?: AddressLike
            l2GasLimit?: NumberLike
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID: NumberLike,
          opts?: {
            recipient?: AddressLike
            l2GasLimit?: NumberLike
            extra_data?: String
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)

    /**
     * Generates a transaction for withdrawing some default (ETH or ERC20) tokens back to the L1 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to withdraw.
     * @param opts Additional options.
     * @param opts.recipient Optional address to receive the funds on L1. Defaults to sender.
     * @param opts.overrides Optional transaction overrides.
     * @returns Transaction that can be signed and executed to withdraw the tokens.
     */
    withdraw:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            recipient?: AddressLike
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID: NumberLike,
          opts?: {
            recipient?: AddressLike
            extra_data?: String
            overrides?: Overrides
          }
        ) => Promise<TransactionRequest>)
  }

  /**
   * Object that holds the functions that estimates the gas required for a given transaction.
   * Follows the pattern used by ethers.js.
   */
  estimateGas: {
    /**
     * Estimates gas required to approve some default (ETH or ERC20) tokens into the L2 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to approve.
     * @param opts Additional options.
     * @param opts.overrides Optional transaction overrides.
     * @returns Gas estimate for the transaction.
     */
    approve:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID: NumberLike,
          opts?: {
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)

    /**
     * Estimates gas required to deposit some default (ETH or ERC20) tokens into the L2 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to deposit.
     * @param TOKEN_ID Token ID for NFTs.
     * @param opts Additional options.
     * @param opts.recipient Optional address to receive the funds on L2. Defaults to sender.
     * @param opts.l2GasLimit Optional gas limit to use for the transaction on L2.
     * @param opts.overrides Optional transaction overrides.
     * @returns Gas estimate for the transaction.
     */
    deposit:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            recipient?: AddressLike
            l2GasLimit?: NumberLike
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID: NumberLike,
          opts?: {
            recipient?: AddressLike
            l2GasLimit?: NumberLike
            extra_data?: String
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)

    /**
     * Estimates gas required to withdraw some default (ETH or ERC20) tokens back to the L1 chain.
     *
     * @param l1Token The L1 token address.
     * @param l2Token The L2 token address.
     * @param amount Amount of the token to withdraw.
     * @param TOKEN_ID Token ID for NFTs.
     * @param opts Additional options.
     * @param opts.recipient Optional address to receive the funds on L1. Defaults to sender.
     * @param opts.overrides Optional transaction overrides.
     * @returns Gas estimate for the transaction.
     */
    withdraw:
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          amount: NumberLike,
          opts?: {
            recipient?: AddressLike
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)
      | ((
          l1Token: AddressLike,
          l2Token: AddressLike,
          TOKEN_ID?: NumberLike,
          opts?: {
            recipient?: AddressLike
            extra_data?: String
            overrides?: CallOverrides
          }
        ) => Promise<BigNumber>)
  }
}
