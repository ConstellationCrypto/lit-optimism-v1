import { BaseServiceV2, Gauge, validators } from '@eth-optimism/common-ts'
import { sleep, toRpcHexString } from '@constellation-labs/core-utils'
import {
  CrossChainMessenger,
  initializeMessenger,
} from '@constellation-labs/sdk'
import { getContractInterface } from '@constellation-labs/contracts'
import { AwsKmsSigner } from '@constellation-labs/key-manager'
import { Provider } from '@ethersproject/abstract-provider'
import { Contract, ethers, Signer } from 'ethers'
import dateformat from 'dateformat'

import {
  findFirstUnfinalizedStateBatchIndex,
  findEventForStateBatch,
} from './helpers'

type Options = {
  l1RpcProvider: Provider
  l2RpcProvider: Provider
  startBatchIndex: number
  pauseBridgeOnFault: boolean
  crossDomainMessengerOwner: string
  region: string
  kmsID: string
  addressEndpoint: string
  pauseModuleAddress: string
}

type Metrics = {
  highestCheckedBatchIndex: Gauge
  highestKnownBatchIndex: Gauge
  isCurrentlyMismatched: Gauge
  inUnexpectedErrorState: Gauge
}

type State = {
  scc: Contract
  messenger: CrossChainMessenger
  highestCheckedBatchIndex: number
  crossDomainMessengerOwnerSigner: Signer
  l1CrossDomainMessenger: Contract
  pauseModule: Contract
}

export class FaultDetector extends BaseServiceV2<Options, Metrics, State> {
  constructor(options?: Partial<Options>) {
    super({
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      version: require('../package.json').version,
      name: 'fault-detector',
      loop: true,
      loopIntervalMs: 1000,
      options,
      optionsSpec: {
        l1RpcProvider: {
          validator: validators.provider,
          desc: 'Provider for interacting with L1',
          secret: true,
        },
        l2RpcProvider: {
          validator: validators.provider,
          desc: 'Provider for interacting with L2',
          secret: true,
        },
        startBatchIndex: {
          validator: validators.num,
          default: -1,
          desc: 'Batch index to start checking from',
        },
        pauseBridgeOnFault: {
          validator: validators.bool,
          default: true,
          desc: 'Whether to pause relaying L2 -> L1 messages on fault detection',
        },
        crossDomainMessengerOwner: {
          validator: validators.str,
          desc: 'Key of the address manager owner',
          default: '',
          secret: true,
        },
        region: {
          validator: validators.str,
          default: '',
          desc: 'AWS region',
        },
        kmsID: {
          validator: validators.str,
          default: '',
          desc: 'KMS ID of the address manager owner',
        },
        pauseModuleAddress: {
          validator: validators.str,
          desc: 'Address of the pause module for the gnosis safe',
          default: '',
        },
        addressEndpoint: {
          validator: validators.url,
          desc: 'Addresses.json endpoint',
        },
      },
      metricsSpec: {
        highestCheckedBatchIndex: {
          type: Gauge,
          desc: 'Highest good batch index',
        },
        highestKnownBatchIndex: {
          type: Gauge,
          desc: 'Highest known batch index',
        },
        isCurrentlyMismatched: {
          type: Gauge,
          desc: '0 if state is ok, 1 if state is mismatched',
        },
        inUnexpectedErrorState: {
          type: Gauge,
          desc: '0 if service is ok, 1 service is in unexpected error state',
        },
      },
    })
  }

  async init(): Promise<void> {
    this.state.messenger = await initializeMessenger(
      this.options.l1RpcProvider,
      this.options.l2RpcProvider,
      this.options.addressEndpoint
    )

    // We use this a lot, a bit cleaner to pull out to the top level of the state object.
    this.state.scc = this.state.messenger.contracts.l1.StateCommitmentChain
    this.state.l1CrossDomainMessenger =
      this.state.messenger.contracts.l1.L1CrossDomainMessenger
    // TODO: load KMS signer instead
    if (
      (this.options.crossDomainMessengerOwner !== '') ===
      (this.options.kmsID !== '')
    ) {
      throw new Error(
        'You must set exactly one of the private key or the KMS id for the cross domain messenger owner'
      )
    }
    if (this.options.kmsID !== '') {
      this.state.crossDomainMessengerOwnerSigner = new AwsKmsSigner(
        { keyId: this.options.kmsID, region: this.options.region },
        this.options.l1RpcProvider
      )
      // Check to make sure that we can fetch the address (ensures that the KMS is working properly)
      console.log(
        'Address of the KMS signer:',
        await this.state.crossDomainMessengerOwnerSigner.getAddress()
      )
    } else {
      this.state.crossDomainMessengerOwnerSigner = new ethers.Wallet(
        this.options.crossDomainMessengerOwner,
        this.options.l1RpcProvider
      )
      console.log(
        'Address of the cross domain messenger owner:',
        await this.state.crossDomainMessengerOwnerSigner.getAddress()
      )
    }

    if (this.options.pauseModuleAddress !== '') {
      console.log(`Using PauseModule at ${this.options.pauseModuleAddress}`)
      this.state.pauseModule = new Contract(
        this.options.pauseModuleAddress,
        getContractInterface('PauseModule')
      )
    }

    // Figure out where to start syncing from.
    if (this.options.startBatchIndex === -1) {
      this.logger.info(`finding appropriate starting height`)
      this.state.highestCheckedBatchIndex =
        await findFirstUnfinalizedStateBatchIndex(this.state.scc)
    } else {
      this.state.highestCheckedBatchIndex = this.options.startBatchIndex
    }

    this.logger.info(`starting height`, {
      startBatchIndex: this.state.highestCheckedBatchIndex,
    })
  }

  async main(): Promise<void> {
    const latestBatchIndex = await this.state.scc.getTotalBatches()
    if (this.state.highestCheckedBatchIndex >= latestBatchIndex.toNumber()) {
      await sleep(15000)
      return
    }

    this.metrics.highestKnownBatchIndex.set(latestBatchIndex.toNumber())

    this.logger.info(`checking batch`, {
      batchIndex: this.state.highestCheckedBatchIndex,
      latestIndex: latestBatchIndex.toNumber(),
    })

    let event: ethers.Event
    try {
      event = await findEventForStateBatch(
        this.state.scc,
        this.state.highestCheckedBatchIndex
      )
    } catch (err) {
      this.logger.error(`got unexpected error while searching for batch`, {
        batchIndex: this.state.highestCheckedBatchIndex,
        error: err,
      })
    }

    const batchTransaction = await event.getTransaction()
    const [stateRoots] = this.state.scc.interface.decodeFunctionData(
      'appendStateBatch',
      batchTransaction.data
    )

    const batchStart = event.args._prevTotalElements.toNumber() + 1
    const batchSize = event.args._batchSize.toNumber()
    // batchStart and batchEnd are inclusive. batchEnd is the block number of the latest block
    // with a corresponding state root
    const batchEnd = batchStart + batchSize - 1

    const latestBlock = await this.options.l2RpcProvider.getBlockNumber()
    if (latestBlock < batchEnd) {
      this.logger.info(`node is behind, waiting for sync`, {
        batchEnd,
        latestBlock,
      })
      return
    }

    // `getBlockRange` has a limit of 1000 blocks, so we have to break this request out into
    // multiple requests of maximum 1000 blocks in the case that batchSize > 1000.
    let blocks: any[] = []
    for (let i = 0; i < batchSize; i += 1000) {
      const provider = this.options
        .l2RpcProvider as ethers.providers.JsonRpcProvider
      blocks = blocks.concat(
        await provider.send('eth_getBlockRange', [
          toRpcHexString(batchStart + i),
          toRpcHexString(batchStart + i + Math.min(batchSize - i, 1000) - 1),
          false,
        ])
      )
    }

    for (const [i, stateRoot] of stateRoots.entries()) {
      if (blocks[i].stateRoot !== stateRoot) {
        this.metrics.isCurrentlyMismatched.set(1)
        const fpw = await this.state.scc.FRAUD_PROOF_WINDOW()
        this.logger.error(`state root mismatch`, {
          blockNumber: blocks[i].number,
          expectedStateRoot: blocks[i].stateRoot,
          actualStateRoot: stateRoot,
          finalizationTime: dateformat(
            new Date(
              (ethers.BigNumber.from(blocks[i].timestamp).toNumber() +
                fpw.toNumber()) *
                1000
            ),
            'mmmm dS, yyyy, h:MM:ss TT'
          ),
        })
        if (this.options.pauseBridgeOnFault) {
          this.logger.info('Pausing the relay of L2 -> L1 messages!')
          if (await this.state.l1CrossDomainMessenger.paused()) {
            this.logger.info('L1 Cross Domain Messenger already paused')
          } else {
            if (this.options.pauseModuleAddress !== '') {
              console.log('Pausing messenger via pause module')
              await this.state.pauseModule
                .connect(this.state.crossDomainMessengerOwnerSigner)
                .pauseL1CrossDomainMessenger()
            } else {
              console.log('Pausing messenger via EOA owner')
              await this.state.l1CrossDomainMessenger
                .connect(this.state.crossDomainMessengerOwnerSigner)
                .pause()
            }
          }
        }
        return
      }
    }

    this.state.highestCheckedBatchIndex++
    this.metrics.highestCheckedBatchIndex.set(
      this.state.highestCheckedBatchIndex
    )

    // If we got through the above without throwing an error, we should be fine to reset.
    this.metrics.isCurrentlyMismatched.set(0)
    this.metrics.inUnexpectedErrorState.set(0)
  }
}

if (require.main === module) {
  const service = new FaultDetector()
  service.run()
}
