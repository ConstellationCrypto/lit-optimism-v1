/* Imports: External */
import { BigNumber, Contract, utils, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { MessageStatus } from '@constellation-labs/sdk'
/* Imports: Internal */
import Artifact_L1_FPE from '@constellation-labs/contracts/artifacts/contracts/L1/token/L1_FPE.sol/L1_FPE.json'
import Artifact_L2_FPE from '@constellation-labs/contracts/artifacts/contracts/L2/predeploys/L2_FPE.sol/L2_FPE.json'
import { predeploys } from '@constellation-labs/contracts'

import { expect } from './shared/setup'
import { OptimismEnv } from './shared/env'
import { envConfig, withdrawalTest } from './shared/utils'

describe('CONSTELLATION FPE', () => {
  before(async function () {
    if (!envConfig.TEST_FPE) {
      this.skip()
    }
  })

  let env: OptimismEnv
  before(async () => {
    env = await OptimismEnv.new()
  })

  let otherWalletL1: Wallet
  let otherWalletL2: Wallet
  before(async () => {
    const other = Wallet.createRandom()
    otherWalletL1 = other.connect(env.l1Wallet.provider)
    otherWalletL2 = other.connect(env.l2Wallet.provider)

    const tx1 = await env.l1Wallet.sendTransaction({
      to: otherWalletL1.address,
      value: utils.parseEther('0.01'),
    })
    await tx1.wait()
    const tx2 = await env.l2Wallet.sendTransaction({
      to: otherWalletL2.address,
      value: utils.parseEther('0.01'),
    })
    await tx2.wait()
  })

  // This is one of the only stateful integration tests in which we don't set up a new contract
  // before each test. We do this because the test is more of an "actor-based" test where we're
  // going through a series of actions and confirming that the actions are performed correctly at
  // every step.
  let L1__ERC20: Contract
  let L2__ERC20: Contract
  before(async () => {
    L1__ERC20 = new ethers.Contract(
      env.L1_FPE,
      Artifact_L1_FPE.abi,
      env.l1Wallet
    )
    L2__ERC20 = new ethers.Contract(
      predeploys.L2_FPE,
      Artifact_L2_FPE.abi,
      env.l2Wallet
    )
    // Approve the L1 ERC20 to spend our money
    const tx = await L1__ERC20.approve(
      env.messenger.contracts.l1.L1StandardBridge.address,
      1000000
    )
    await tx.wait()
  })
  it('Print properties info:', async () => {
    const _name = await L1__ERC20.name()
    const _symbol = await L1__ERC20.symbol()
    console.log('L2 bridge:', await L2__ERC20.l2Bridge())
    console.log('L1 token:', await L2__ERC20.l1Token())
    console.log('Name:', _name, 'symbol:', _symbol)

    console.log(L1__ERC20.address)
  })

  it('should deposit tokens into L2', async () => {
    const initialL1Balance = await L1__ERC20.balanceOf(env.l1Wallet.address)
    const initialL2Balance = await L2__ERC20.balanceOf(env.l2Wallet.address)
    await env.messenger.waitForMessageReceipt(
      await env.messenger.depositERC20(
        L1__ERC20.address,
        L2__ERC20.address,
        1000
      )
    )

    expect(await L1__ERC20.balanceOf(env.l1Wallet.address)).to.deep.equal(
      BigNumber.from(initialL1Balance).sub(1000)
    )
    expect(await L2__ERC20.balanceOf(env.l2Wallet.address)).to.deep.equal(
      BigNumber.from(initialL2Balance).add(1000)
    )
  })

  it('should transfer tokens on L2', async () => {
    const initialL2Balance = await L2__ERC20.balanceOf(env.l2Wallet.address)
    const tx = await L2__ERC20.transfer(otherWalletL1.address, 500)
    await tx.wait()

    expect(await L2__ERC20.balanceOf(env.l2Wallet.address)).to.deep.equal(
      BigNumber.from(initialL2Balance).sub(500)
    )
    expect(await L2__ERC20.balanceOf(otherWalletL2.address)).to.deep.equal(
      BigNumber.from(500)
    )
  })

  withdrawalTest(
    'should withdraw tokens from L2 to the depositor',
    async () => {
      const initialL1Balance = await L1__ERC20.balanceOf(env.l1Wallet.address)
      const initialL2Balance = await L2__ERC20.balanceOf(env.l2Wallet.address)
      const tx = await env.messenger.withdrawERC20(
        L1__ERC20.address,
        L2__ERC20.address,
        500
      )

      await env.messenger.waitForMessageStatus(
        tx,
        MessageStatus.READY_FOR_RELAY
      )

      await env.messenger.finalizeMessage(tx)
      await env.messenger.waitForMessageReceipt(tx)

      expect(await L1__ERC20.balanceOf(env.l1Wallet.address)).to.deep.equal(
        BigNumber.from(initialL1Balance).add(500)
      )
      expect(await L2__ERC20.balanceOf(env.l2Wallet.address)).to.deep.equal(
        BigNumber.from(initialL2Balance).sub(500)
      )
    }
  )

  withdrawalTest(
    'should withdraw tokens from L2 to the transfer recipient',
    async () => {
      const tx = await env.messenger.withdrawERC20(
        L1__ERC20.address,
        L2__ERC20.address,
        500,
        {
          signer: otherWalletL2,
        }
      )

      await env.messenger.waitForMessageStatus(
        tx,
        MessageStatus.READY_FOR_RELAY
      )

      await env.messenger.finalizeMessage(tx)
      await env.messenger.waitForMessageReceipt(tx)

      expect(await L1__ERC20.balanceOf(otherWalletL1.address)).to.deep.equal(
        BigNumber.from(500)
      )
      expect(await L2__ERC20.balanceOf(otherWalletL2.address)).to.deep.equal(
        BigNumber.from(0)
      )
    }
  )

  // This test demonstrates that an apparent withdrawal bug is in fact non-existent.
  // Specifically, the L2 bridge does not check that the L2 token being burned corresponds
  // with the L1 token which is specified for the withdrawal.
  withdrawalTest(
    'should not allow an arbitrary L2 token to be withdrawn in exchange for a legitimate L1 token',
    async () => {
      const initialL2Balance = await L2__ERC20.balanceOf(env.l2Wallet.address)
      // First deposit some of the L1 token to L2, so that there is something which could be stolen.
      await env.messenger.waitForMessageReceipt(
        await env.messenger.depositERC20(
          L1__ERC20.address,
          L2__ERC20.address,
          1000
        )
      )

      expect(await L2__ERC20.balanceOf(env.l2Wallet.address)).to.deep.equal(
        BigNumber.from(initialL2Balance).add(1000)
      )

      // Deploy a Fake L2 token, which:
      // - returns the address of a legitimate L1 token from its l1Token() getter.
      // - allows the L2 bridge to call its burn() function.
      const fakeToken = await (
        await ethers.getContractFactory('FakeL2StandardERC20', env.l2Wallet)
      ).deploy(
        L1__ERC20.address,
        env.messenger.contracts.l2.L2StandardBridge.address
      )
      await fakeToken.deployed()

      const balBefore = await L1__ERC20.balanceOf(otherWalletL1.address)

      // Withdraw some of the Fake L2 token, hoping to receive the same amount of the legitimate
      // token on L1.
      const withdrawalTx = await env.messenger.withdrawERC20(
        L1__ERC20.address,
        fakeToken.address,
        500,
        {
          signer: otherWalletL2,
        }
      )

      await env.messenger.waitForMessageStatus(
        withdrawalTx,
        MessageStatus.READY_FOR_RELAY
      )

      await env.messenger.finalizeMessage(withdrawalTx)
      await env.messenger.waitForMessageReceipt(withdrawalTx)

      // Ensure that the L1 recipient address has not received any additional L1 token balance.
      expect(await L1__ERC20.balanceOf(otherWalletL1.address)).to.deep.equal(
        balBefore
      )
    }
  )
})
