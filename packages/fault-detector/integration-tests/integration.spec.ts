import fs from 'fs'
import { rejects } from 'assert'

import {
  CrossChainMessenger,
  initializeMessenger,
  MessageStatus,
} from '@constellation-labs/sdk'
import { AwsKmsSigner } from '@constellation-labs/key-manager'
import { ethers, Signer, Contract } from 'ethers'
import hre from 'hardhat'
import {
  encodeAppendSequencerBatch,
  sleep,
} from '@constellation-labs/core-utils'
import { toInteger } from 'lodash'

import { expect } from './setup'

const appendSequencerBatch = async (
  CanonicalTransactionChain: Contract,
  batch
) => {
  return CanonicalTransactionChain.signer.sendTransaction({
    to: CanonicalTransactionChain.address,
    data:
      ethers.utils.id('appendSequencerBatch()').slice(0, 10) +
      encodeAppendSequencerBatch(batch),
  })
}

console.log('Loading keys from Constellation-Optimism/.constellation/secret')
const secret = JSON.parse(
  fs.readFileSync('../../.constellation/secret', 'utf-8')
)

const region = 'us-west-2'
const loadKMSorKey = (
  value: string,
  provider: ethers.providers.Provider
): Signer | AwsKmsSigner => {
  if (ethers.utils.isHexString(value, 32)) {
    return new ethers.Wallet(value, provider)
  } else {
    return new AwsKmsSigner({ keyId: value, region }, provider)
  }
}

describe('Fault Detection integration test', () => {
  let messenger: CrossChainMessenger
  let StateCommitmentChain
  let CanonicalTransactionChain
  let sequencerWallet: Signer
  let proposerWallet
  let l1Provider
  let l2Provider
  let deployerWallet
  let tx
  before(async () => {
    l1Provider = new ethers.providers.JsonRpcProvider('http://localhost:9545')
    l2Provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    // TODO: Load KMS signers instead for sequencer and proposer
    sequencerWallet = loadKMSorKey(secret.OVM_SEQUENCER, l1Provider)
    proposerWallet = loadKMSorKey(secret.OVM_PROPOSER, l1Provider)
    deployerWallet = loadKMSorKey(secret.DEPLOYER, l2Provider)
    messenger = await initializeMessenger(
      deployerWallet.connect(l1Provider),
      deployerWallet.connect(l2Provider),
      'http://localhost:8080/addresses.json'
    )
    StateCommitmentChain =
      messenger.contracts.l1.StateCommitmentChain.connect(proposerWallet)
    CanonicalTransactionChain = messenger.contracts.l1.CanonicalTransactionChain
  })
  it('fraudulent batch should pause bridge', async () => {
    const gasPrice = await l1Provider.getGasPrice()

    // Initiate the withdrawal on the L2, and wait until the message is ready to be finalized
    const withdrawTx = await messenger.withdrawETH(3)
    await withdrawTx.wait()
    await messenger.waitForMessageStatus(
      withdrawTx,
      MessageStatus.READY_FOR_RELAY
    )

    // Append a fraudulent batch + state root to the L1 rollup contracts
    const numBatches = toInteger(
      await CanonicalTransactionChain.getTotalElements()
    )
    tx = await appendSequencerBatch(
      CanonicalTransactionChain.connect(sequencerWallet),
      {
        transactions: ['0x1234'],
        contexts: [
          {
            numSequencedTransactions: 0,
            numSubsequentQueueTransactions: 0,
            timestamp: 0,
            blockNumber: 0,
          },
        ],
        shouldStartAtElement: numBatches,
        totalElementsToAppend: 1,
      }
    )
    tx.wait()
    await StateCommitmentChain.appendStateBatch(
      [hre.ethers.constants.HashZero],
      await StateCommitmentChain.getTotalElements()
    )
    // Send a tx on the L2 so that there is a base of comparison for the state root
    await deployerWallet.sendTransaction({
      to: deployerWallet.address,
      value: 1,
    })

    // 30 seconds should give the fault detector enough time to detect a fraudulent state root
    // and pause the bridge. Then, finalizing the transaction should fail and the bridge should
    // be paused.
    await sleep(30_000)
    await rejects(
      messenger.finalizeMessage(withdrawTx, { overrides: { gasPrice } })
    )
    expect(
      await messenger.contracts.l1.L1CrossDomainMessenger.paused(),
      'Expect the bridge to be paused'
    ).to.be.true
    console.log('Successfully paused bridge and prevented withdrawal')
  }).timeout(1_000_000)
})
