import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { serialize } from '@ethersproject/transactions'
chai.use(chaiAsPromised)
import { expectApprox } from '@constellation-labs/core-utils'
import Artifact_L1_FPE from '@constellation-labs/contracts/artifacts/contracts/L1/token/L1_FPE.sol/L1_FPE.json'
import Artifact_L2_FPE from '@constellation-labs/contracts/artifacts/contracts/L2/predeploys/L2_FPE.sol/L2_FPE.json'
import Artifact_FPE_GasPriceOracle from '@constellation-labs/contracts/artifacts/contracts/L2/predeploys/FPE_GasPriceOracle.sol/FPE_GasPriceOracle.json'
/* Imports: External */
import { ethers, BigNumber, Contract, utils, Wallet } from 'ethers'
import { predeploys, getContractInterface } from '@constellation-labs/contracts'
import { MessageStatus } from '@constellation-labs/sdk'

/* Imports: Internal */
import { OptimismEnv } from './shared/env'
import { envConfig, gasPriceOracleWallet, l2Provider } from './shared/utils'

const extractRawTransaction = (unsigned) => {
  return serialize({
    nonce: parseInt(unsigned.nonce.toString(10), 10),
    value: unsigned.value,
    gasPrice: unsigned.gasPrice,
    gasLimit: unsigned.gasLimit,
    to: unsigned.to,
    data: unsigned.data,
  })
}

const mulPriceRatio = (num, unnormalizedPriceRatio, decimals) => {
  return BigNumber.from(num)
    .mul(unnormalizedPriceRatio)
    .div(BigNumber.from(10).pow(decimals))
}

describe('CONSTELLATION: FPE Fee Payment Integration Tests', async () => {
  before(async function () {
    if (!envConfig.TEST_FPE) {
      this.skip()
    }
  })

  let env: OptimismEnv
  let L1FPE: Contract
  let L2FPE: Contract
  let FPE_GasPriceOracle: Contract

  before(async () => {
    console.log('initializing contracts')
    env = await OptimismEnv.new()
    L1FPE = new ethers.Contract(env.L1_FPE, Artifact_L1_FPE.abi, env.l1Wallet)
    L2FPE = new ethers.Contract(
      predeploys.L2_FPE,
      Artifact_L2_FPE.abi,
      env.l2Wallet
    )
    FPE_GasPriceOracle = new ethers.Contract(
      predeploys.FPE_GasPriceOracle,
      Artifact_FPE_GasPriceOracle.abi,
      gasPriceOracleWallet
    )
    const registerTx = await FPE_GasPriceOracle.useETHAsFeeToken({
      gasPrice: 0,
    })
    await registerTx.wait()
    await (
      await FPE_GasPriceOracle.setPriceRatio(1_000_000, { gasPrice: 0 })
    ).wait()
    await (
      await FPE_GasPriceOracle.setPriceRatioDecimals(6, { gasPrice: 0 })
    ).wait()
  })

  let otherWalletL1: Wallet
  let otherWalletL2: Wallet
  before(async () => {
    console.log('Populating wallets')
    const otherWallet = Wallet.createRandom()
    otherWalletL1 = otherWallet.connect(env.l1Wallet.provider)
    otherWalletL2 = otherWallet.connect(env.l2Wallet.provider)

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

    const tx3 = await env.l2Wallet.sendTransaction({
      to: gasPriceOracleWallet.address,
      value: utils.parseEther('0.01'),
    })
    await tx3.wait()
  })
  before('depositing tokens into L2', async () => {
    console.log('Depositing tokens into L2')
    const amount = ethers.utils.parseEther('1000.0')
    const tx = await L1FPE.approve(
      env.messenger.contracts.l1.L1StandardBridge.address,
      amount.mul(2)
    )
    await tx.wait()
    const deposit1 = await env.messenger.depositERC20(
      L1FPE.address,
      L2FPE.address,
      amount
    )
    const deposit2 = await env.messenger.depositERC20(
      L1FPE.address,
      L2FPE.address,
      amount,
      { recipient: gasPriceOracleWallet.address }
    )
    await env.messenger.waitForMessageReceipt(deposit1)
    await env.messenger.waitForMessageReceipt(deposit2)
  })

  it('{tag:FPE} should register to use FPE as the fee token', async () => {
    // Register l1wallet for using FPE as the fee token
    const registerTx = await FPE_GasPriceOracle.useFPEAsFeeToken()
    await registerTx.wait()

    expect(await FPE_GasPriceOracle.usingFeePayingERC20()).to.be.deep.eq(true)
  })

  it('{tag:FPE} should reject a transaction with a too low gas limit', async () => {
    const tx = {
      to: env.l2Wallet.address,
      value: ethers.utils.parseEther('1'),
      gasLimit: 1100000,
    }

    const gasLimit = await env.l2Wallet.estimateGas(tx)
    tx.gasLimit = gasLimit.toNumber() - 10

    await expect(env.l2Wallet.sendTransaction(tx)).to.be.rejectedWith(
      'invalid transaction: intrinsic gas too low'
    )
  })

  it('{tag:FPE} should reject with insufficient FPE error', async () => {
    const wallet = ethers.Wallet.createRandom().connect(env.l2Provider)
    const fundTx = await env.l2Wallet.sendTransaction({
      to: wallet.address,
      value: ethers.utils.parseEther('0.5'),
    })
    await fundTx.wait()
    await expect(
      wallet.sendTransaction({
        to: env.l2Wallet.address,
        value: ethers.utils.parseEther('0.5'),
        gasLimit: ethers.utils.hexlify(1000000),
      })
    ).to.be.rejectedWith(
      'invalid transaction: insufficient FPE funds for gas * price + value'
    )
  })

  it("{tag:FPE} should revert tx if users don't have enough FPE", async () => {
    const wallet = ethers.Wallet.createRandom().connect(env.l2Provider)

    const txRequest = await wallet.populateTransaction({
      to: env.l2Wallet.address,
      value: ethers.utils.parseEther('0.5'),
      gasLimit: ethers.utils.hexlify(1000000),
    })
    await expect(l2Provider.call(txRequest)).to.be.rejectedWith(
      'insufficient FPE balance to pay for gas'
    )
  })

  it('{tag:FPE} should display fpe balance as native balance', async () => {
    const fpeBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    const nativeBalance = await l2Provider.getBalance(env.l2Wallet.address)
    expect(fpeBalance).to.be.deep.eq(nativeBalance)
    const tx = await env.l2Wallet.sendTransaction({
      to: gasPriceOracleWallet.address,
      value: utils.parseEther('0.01'),
    })
    await tx.wait()
    const postFPEBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    expect(await l2Provider.getBalance(env.l2Wallet.address)).to.be.deep.eq(
      postFPEBalance
    )
  })

  it('{tag:FPE} should work with an adjusted price ratio', async () => {
    const origDecimalsValue = await FPE_GasPriceOracle.priceRatioDecimals()
    await (
      await FPE_GasPriceOracle.setPriceRatio(5_000_000, { gasPrice: 0 })
    ).wait()
    await (
      await FPE_GasPriceOracle.setPriceRatioDecimals(7, { gasPrice: 0 })
    ).wait()

    const preBalance = await l2Provider.getBalance(env.l2Wallet.address)
    const amount = utils.parseEther('0.01')

    const unsigned = await env.l2Wallet.populateTransaction({
      to: gasPriceOracleWallet.address,
      value: amount,
      gasLimit: 500000,
    })
    const raw = extractRawTransaction(unsigned)

    const tx = await env.l2Wallet.sendTransaction(unsigned)
    const receipt = await tx.wait()

    const unnormalizedPriceRatio = await FPE_GasPriceOracle.priceRatio()
    const priceRatioDecimals = await FPE_GasPriceOracle.priceRatioDecimals()
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
      gasPriceOracleWallet
    ).getL1Fee(raw)

    const expectedFeePaid = mulPriceRatio(
      l1Fee,
      unnormalizedPriceRatio,
      priceRatioDecimals
    ).add(receipt.gasUsed.mul(tx.gasPrice))
    const postBalance = await l2Provider.getBalance(env.l2Wallet.address)

    // Using expectApprox because there are minor rounding errors with float operations (off by 1)
    expectApprox(preBalance.sub(postBalance).sub(amount), expectedFeePaid, {
      percentUpperDeviation: 1,
    })
    await (
      await FPE_GasPriceOracle.setPriceRatioDecimals(origDecimalsValue, {
        gasPrice: 0,
      })
    ).wait()
  })

  it('{tag:FPE} should send native transaction appropriately', async () => {
    const preBalance = await l2Provider.getBalance(env.l2Wallet.address)
    const amount = utils.parseEther('0.01')

    const unsigned = await env.l2Wallet.populateTransaction({
      to: gasPriceOracleWallet.address,
      value: amount,
      gasLimit: 500000,
    })
    const raw = extractRawTransaction(unsigned)

    const tx = await env.l2Wallet.sendTransaction(unsigned)
    const receipt = await tx.wait()

    const unnormalizedPriceRatio = await FPE_GasPriceOracle.priceRatio()
    const priceRatioDecimals = await FPE_GasPriceOracle.priceRatioDecimals()
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
      gasPriceOracleWallet
    ).getL1Fee(raw)

    const expectedFeePaid = mulPriceRatio(
      l1Fee,
      unnormalizedPriceRatio,
      priceRatioDecimals
    ).add(receipt.gasUsed.mul(tx.gasPrice))
    const postBalance = await l2Provider.getBalance(env.l2Wallet.address)

    // Using expectApprox because there are minor rounding errors with float operations (off by 1)
    expectApprox(preBalance.sub(postBalance).sub(amount), expectedFeePaid, {
      percentUpperDeviation: 1,
    })
  })
  it('{tag:FPE} should send FPE transaction appropriately', async () => {
    const preBalance = await l2Provider.getBalance(env.l2Wallet.address)
    const amount = utils.parseEther('0.01')
    const prelimUnsigned = await L2FPE.populateTransaction.transfer(
      gasPriceOracleWallet.address,
      amount
    )
    const unsigned = await env.l2Wallet.populateTransaction({
      to: prelimUnsigned.to,
      data: prelimUnsigned.data,
    })
    const raw = extractRawTransaction(unsigned)
    const unnormalizedPriceRatio = await FPE_GasPriceOracle.priceRatio()
    const priceRatioDecimals = await FPE_GasPriceOracle.priceRatioDecimals()
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
      gasPriceOracleWallet
    ).getL1Fee(raw)

    const tx = await env.l2Wallet.sendTransaction(unsigned)
    const receipt = await tx.wait()
    expect(receipt.status).to.eq(1)
    const expectedFeePaid = mulPriceRatio(
      l1Fee,
      unnormalizedPriceRatio,
      priceRatioDecimals
    ).add(receipt.gasUsed.mul(tx.gasPrice))
    const postBalance = await l2Provider.getBalance(env.l2Wallet.address)
    // Using expectApprox because there are minor rounding errors with float operations (off by 1)
    expectApprox(preBalance.sub(postBalance).sub(amount), expectedFeePaid, {
      percentUpperDeviation: 1,
    })
  })

  it('{tag:FPE} can deposit, transfer, withdraw wrapped ETH via while the network is using FPE', async () => {
    // deposit
    const OVM_ETH = new ethers.Contract(
      predeploys.OVM_ETH,
      getContractInterface('OVM_ETH'),
      env.l2Wallet
    )
    const preBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    const depositAmount = utils.parseEther('0.01')
    const depositTx = await env.messenger.depositETH(depositAmount)
    await env.messenger.waitForMessageReceipt(depositTx)
    const postBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    expect(postBalance.sub(preBalance)).to.be.deep.eq(depositAmount)

    // transfer
    const transferAmount = utils.parseEther('0.005')
    const preTransferFPEBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    const preTransferEthBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    const transferTxPrelim = await OVM_ETH.populateTransaction.transfer(
      gasPriceOracleWallet.address,
      transferAmount
    )
    const transferTxUnsigned = await env.l2Wallet.populateTransaction({
      to: transferTxPrelim.to,
      data: transferTxPrelim.data,
    })
    const raw = extractRawTransaction(transferTxUnsigned)
    const unnormalizedPriceRatio = await FPE_GasPriceOracle.priceRatio()
    const priceRatioDecimals = await FPE_GasPriceOracle.priceRatioDecimals()
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
      gasPriceOracleWallet
    ).getL1Fee(raw)

    const tx = await env.l2Wallet.sendTransaction(transferTxUnsigned)
    const receipt = await tx.wait()
    expect(receipt.status).to.eq(1)
    const expectedFeePaid = mulPriceRatio(
      l1Fee,
      unnormalizedPriceRatio,
      priceRatioDecimals
    ).add(receipt.gasUsed.mul(tx.gasPrice))
    const postTransferFPEBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    const postTransferEthBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    // Using expectApprox because there are minor rounding errors with float operations (off by 1)
    expectApprox(
      preTransferFPEBalance.sub(postTransferFPEBalance),
      expectedFeePaid,
      { percentUpperDeviation: 1 }
    )
    expect(preTransferEthBalance.sub(postTransferEthBalance)).to.be.deep.eq(
      transferAmount
    )

    // withdraw
    const preWithdrawL1Balance = await env.l1Provider.getBalance(
      env.l1Wallet.address
    )
    const preWithdrawEthBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    const preWithdrawFPEBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    const withdrawAmount = utils.parseEther('0.005')
    const withdrawTx = await env.messenger.withdrawETH(withdrawAmount)
    withdrawTx.wait()
    await env.messenger.waitForMessageStatus(
      withdrawTx,
      MessageStatus.READY_FOR_RELAY
    )
    const finalizeMessageTx = await env.messenger.finalizeMessage(withdrawTx)
    await finalizeMessageTx.wait()
    await env.messenger.waitForMessageReceipt(withdrawTx)
    const postWithdrawEthBalance = await OVM_ETH.balanceOf(env.l2Wallet.address)
    const postWithdrawFPEBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    const postWithdrawL1Balance = await env.l1Provider.getBalance(
      env.l1Wallet.address
    )
    expect(preWithdrawEthBalance.sub(postWithdrawEthBalance)).to.be.deep.eq(
      withdrawAmount
    )
    expect(preWithdrawFPEBalance).to.not.eq(postWithdrawFPEBalance)
    expectApprox(
      postWithdrawL1Balance.sub(preWithdrawL1Balance),
      withdrawAmount,
      { percentUpperDeviation: 1 }
    )
  })

  it('{tag:FPE} should not be able to withdraw fees before the minimum is met', async () => {
    const l1FeeWallet = await FPE_GasPriceOracle.l1FeeWallet()
    if (
      (await L2FPE.balanceOf(l1FeeWallet)) <
      (await FPE_GasPriceOracle.MIN_WITHDRAWAL_AMOUNT())
    ) {
      await expect(FPE_GasPriceOracle.withdraw()).to.be.rejected
    }
  })

  // Test for withdrawals on the Gas Oracle
  it('{tag:FPE} should be able to withdraw fees back to L1 once the minimum is met', async function () {
    const l1FeeWallet = await FPE_GasPriceOracle.l1FeeWallet()
    const balanceBefore = await L1FPE.balanceOf(l1FeeWallet)
    const withdrawalAmount = await FPE_GasPriceOracle.MIN_WITHDRAWAL_AMOUNT()

    const l2WalletBalance = await L2FPE.balanceOf(env.l2Wallet.address)
    if (l2WalletBalance.lt(withdrawalAmount)) {
      console.log(
        `NOTICE: must have at least ${ethers.utils.formatEther(
          withdrawalAmount
        )} FPE on L2 to execute this test, only has ${ethers.utils.formatEther(
          l2WalletBalance
        )}, skipping`
      )
      this.skip()
    }

    // Transfer the minimum required to withdraw.
    const tx = await L2FPE.transfer(
      FPE_GasPriceOracle.address,
      withdrawalAmount
    )
    await tx.wait()

    const vaultBalance = await L2FPE.balanceOf(FPE_GasPriceOracle.address)

    // Submit the withdrawal.

    const OWNER_FPE_GasPriceOracle = new ethers.Contract(
      predeploys.FPE_GasPriceOracle,
      Artifact_FPE_GasPriceOracle.abi,
      gasPriceOracleWallet
    )
    // the owner should be able to withdraw without gas
    const withdrawTx = await OWNER_FPE_GasPriceOracle.withdraw({
      gasPrice: 0,
    })

    // Wait for the withdrawal to be relayed to L1.
    await withdrawTx.wait()
    await env.relayXDomainMessages(withdrawTx)
    await env.waitForXDomainTransaction(withdrawTx)

    // Balance difference should be equal to old L2 balance.
    const balanceAfter = await L1FPE.balanceOf(l1FeeWallet)
    expect(balanceAfter.sub(balanceBefore)).to.deep.equal(
      BigNumber.from(vaultBalance)
    )
  })

  // Do the rest of the integration tests normally
  it('{tag:FPE} can register to use ETH as the fee token', async () => {
    const registerTx = await FPE_GasPriceOracle.useETHAsFeeToken()
    await registerTx.wait()
  })

  after(async () => {
    const registerTx = await FPE_GasPriceOracle.useETHAsFeeToken()
    await registerTx.wait()
  })
})
