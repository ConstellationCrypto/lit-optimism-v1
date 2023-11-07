import { ethers } from 'hardhat'
import { predeploys } from '@constellation-labs/contracts'
import { Contract } from 'ethers'

import ERC20_abi from './artifacts/ERC20.abi.json'
import { MessageStatus, CrossChainMessenger, initializeMessenger } from '../src'
import { expect } from './setup'

const l1RpcUrl = process.env['L1_RPC_URL'] || 'http://localhost:9545'
const privateKey =
  process.env['PRIVATE_KEY'] ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const addressEndpoint =
  process.env['ADDRESS_ENDPOINT'] || 'http://localhost:8080/addresses.json'
const getLogsEndpoint =
  process.env['GET_LOGS_ENDPOINT'] || 'http://localhost:8545/'
const l2RpcUrl = process.env['L2_RPC_URL'] || 'http://localhost:8545'
const l1FPEAddress = process.env['L1_FPE_ADDRESS']

describe('CrossChainMessenger Integration', () => {
  let messenger: CrossChainMessenger
  let l1Wallet
  let l2Wallet
  let getLogsProvider
  let l1FPE: Contract
  before(async () => {
    l1Wallet = new ethers.Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(l1RpcUrl)
    )
    l2Wallet = new ethers.Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(l2RpcUrl)
    )
    getLogsProvider = new ethers.providers.JsonRpcProvider(getLogsEndpoint)
    messenger = await initializeMessenger(l1Wallet, l2Wallet, addressEndpoint, {
      getLogsProvider,
    })
    if (l1FPEAddress) {
      l1FPE = new ethers.Contract(
        l1FPEAddress,
        ERC20_abi,
        l1Wallet.connect(l1Wallet.provider)
      )
    }
  })
  it('should successfully do a deposit', async () => {
    const amount = '0.01'
    const depositTx = await messenger.depositETH(
      ethers.utils.parseEther(amount)
    )
    await messenger.waitForMessageStatus(depositTx, MessageStatus.RELAYED)
  })
  describe('should successfully fetch deposits', async () => {
    let depositAccountAddress
    let depositBlock

    before(async () => {
      const amount = '0.01'
      const depositTx = await messenger.depositETH(
        ethers.utils.parseEther(amount)
      )
      await messenger.waitForMessageStatus(depositTx, MessageStatus.RELAYED)
      const receipt = await depositTx.wait()
      depositAccountAddress = depositTx.from
      depositBlock = receipt.blockNumber
    })
    it('should successfully fetch deposits with no specified block range', async () => {
      const deposits = await messenger.getDepositsByAddress(
        depositAccountAddress
      )
      expect(deposits.length).to.be.greaterThan(0)
    })
    it('should successfully fetch deposits with a specified block range', async () => {
      const deposits = await messenger.getDepositsByAddress(
        depositAccountAddress,
        { fromBlock: depositBlock, toBlock: depositBlock + 1 }
      )
      expect(deposits.length).to.be.greaterThan(0)
    })
  })
  it('do multiple withdrawals', async () => {
    console.log('Initating withdrawals')
    let withdrawFPETx
    if (l1FPEAddress) {
      const amount = ethers.utils.parseEther('0.01')
      const approvalTx = await l1FPE.approve(
        messenger.contracts.l1.L1StandardBridge.address,
        amount
      )
      await approvalTx.wait()
      const depositFPETx = await messenger.depositERC20(
        l1FPE.address,
        predeploys.L2_FPE,
        amount
      )
      await messenger.waitForMessageStatus(depositFPETx, MessageStatus.RELAYED)
      withdrawFPETx = await messenger.withdrawERC20(
        l1FPE.address,
        predeploys.L2_FPE,
        10
      )
      await messenger.waitForMessageStatus(
        withdrawFPETx,
        MessageStatus.READY_FOR_RELAY
      )
      console.log('erc20 ready to finalize')
    }
    const withdrawTx1 = await messenger.withdrawETH(10)
    await messenger.waitForMessageStatus(
      withdrawTx1,
      MessageStatus.READY_FOR_RELAY
    )
    const withdrawETHTx = await messenger.withdrawETH(10)
    await messenger.waitForMessageStatus(
      withdrawETHTx,
      MessageStatus.READY_FOR_RELAY
    )
    console.log('eth ready to finalize')
    // Submit a second withdraw to initiate the binary search process within getStateBatchAppendedEventByTransactionIndex
    // which is triggered when searching for a withdraw tx that is not in the most recent batch
    await messenger.finalizeMessage(withdrawTx1)
    await messenger.waitForMessageReceipt(withdrawTx1)
    await messenger.finalizeMessage(withdrawETHTx)
    await messenger.waitForMessageReceipt(withdrawETHTx)
    if (l1FPEAddress) {
      await messenger.finalizeMessage(withdrawFPETx)
      await messenger.waitForMessageReceipt(withdrawFPETx)
    }
    console.log('Successfully finalized both withdrawal transactions')
  }).timeout(1_000_000)
})
