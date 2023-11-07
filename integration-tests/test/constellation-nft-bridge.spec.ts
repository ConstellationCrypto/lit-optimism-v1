import { Contract, ContractFactory, utils, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { predeploys } from '@constellation-labs/contracts'
import Artifact__OptimismMintableERC721Factory from '@constellation-labs/contracts/artifacts/contracts/L2/op-erc721/OptimismMintableERC721Factory.sol/OptimismMintableERC721Factory.json'
import Artifact__OptimismMintableERC721 from '@constellation-labs/contracts/artifacts/contracts/L2/op-erc721/OptimismMintableERC721.sol/OptimismMintableERC721.json'

import Artifact__TestERC721 from '../artifacts/contracts/TestERC721.sol/TestERC721.json'
import { expect } from './shared/setup'
import { OptimismEnv } from './shared/env'
import { withdrawalTest } from './shared/utils'

const TOKEN_ID: number = 1
const FINALIZATION_GAS: number = 1_200_000
const extra_data: string = '0x1111'
const overrides = {
  l2GasLimit: FINALIZATION_GAS,
  extra_data,
}

describe('CONSTELLATION Bridging ERC721', () => {
  let env: OptimismEnv
  before(async () => {
    env = await OptimismEnv.new()
  })

  let aliceWalletL1: Wallet
  let aliceWalletL2: Wallet
  let aliceAddressL1: string
  let aliceAddressL2: string
  let bobWalletL1: Wallet
  let bobWalletL2: Wallet
  let bobAddressL1: string
  before(async () => {
    const alice = Wallet.createRandom()
    aliceWalletL1 = alice.connect(env.l1Wallet.provider)
    aliceWalletL2 = alice.connect(env.l2Wallet.provider)
    aliceAddressL1 = aliceWalletL1.address
    aliceAddressL2 = aliceWalletL2.address

    const tx = await env.l2Wallet.sendTransaction({
      to: aliceAddressL1,
      value: utils.parseEther('0.01'),
    })
    await tx.wait()

    bobWalletL1 = env.l1Wallet
    bobWalletL2 = env.l2Wallet
    bobAddressL1 = env.l1Wallet.address
  })

  let Factory__L1ERC721: ContractFactory
  let OptimismMintableERC721Factory: Contract
  before(async () => {
    Factory__L1ERC721 = await ethers.getContractFactory(
      Artifact__TestERC721.abi,
      Artifact__TestERC721.bytecode,
      bobWalletL1
    )
    OptimismMintableERC721Factory = new ethers.Contract(
      predeploys.OptimismMintableERC721Factory,
      Artifact__OptimismMintableERC721Factory.abi,
      bobWalletL2
    )
  })

  let L1ERC721: Contract
  let OptimismMintableERC721: Contract
  beforeEach(async () => {
    L1ERC721 = await Factory__L1ERC721.deploy()
    await L1ERC721.deployed()

    // Check other bridges

    // Create a L2 Standard ERC721 with the Standard ERC721 Factory
    const tx =
      await OptimismMintableERC721Factory.createStandardOptimismMintableERC721(
        L1ERC721.address,
        'L2ERC721',
        'L2'
      )
    const receipt = await tx.wait()

    // Get the OptimismMintableERC721Created events
    const erc721CreatedEvent = receipt.events[0]
    expect(erc721CreatedEvent.event).to.be.eq('OptimismMintableERC721Created')

    OptimismMintableERC721 = await ethers.getContractAt(
      Artifact__OptimismMintableERC721.abi,
      erc721CreatedEvent.args.localToken
    )
    await OptimismMintableERC721.deployed()

    // Mint an L1 ERC721 to Bob on L1
    const tx2 = await L1ERC721.mint(bobAddressL1, TOKEN_ID)
    await tx2.wait()

    // Approve the L1 Bridge to operate the NFT
    const tx3 = await L1ERC721.approve(
      env.messenger.contracts.l1.L1ERC721Bridge.address,
      TOKEN_ID
    )
    await tx3.wait()
  })

  it('bridgeERC721 and grab the correct cross-chain message', async () => {
    const tx = await env.messenger.depositERC721(
      L1ERC721.address,
      OptimismMintableERC721.address,
      TOKEN_ID,
      overrides
    )
    await env.messenger.waitForMessageReceipt(tx)

    // The L1 Bridge now owns the L1 NFT
    expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
      env.messenger.contracts.l1.L1ERC721Bridge.address
    )

    // Bob owns the NFT on L2
    expect(await OptimismMintableERC721.ownerOf(TOKEN_ID)).to.equal(
      bobAddressL1
    )
    const foundTokenBridgeMessages = await env.messenger.getDepositsByAddress(
      env.l1Wallet.address
    )
    const resolved = await env.messenger.toCrossChainMessage(
      foundTokenBridgeMessages[0]
    )
    expect(resolved.transactionHash).to.deep.equal(tx.hash)
  })

  it('bridgeERC721To', async () => {
    await env.messenger.waitForMessageReceipt(
      await env.messenger.depositERC721(
        L1ERC721.address,
        OptimismMintableERC721.address,
        TOKEN_ID,
        {
          recipient: aliceAddressL1,
          ...overrides,
        }
      )
    )

    // The L1 Bridge now owns the L1 NFT
    expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
      env.messenger.contracts.l1.L1ERC721Bridge.address
    )

    // Alice owns the NFT on L2
    expect(await OptimismMintableERC721.ownerOf(TOKEN_ID)).to.equal(
      aliceAddressL2
    )
  })

  withdrawalTest(
    'bridgeERC721ThenWithdraw and grab the correct cross-chain message',
    async () => {
      // Deposit an NFT into L2 so that there's something to withdraw
      await env.messenger.waitForMessageReceipt(
        await env.messenger.depositERC721(
          L1ERC721.address,
          OptimismMintableERC721.address,
          TOKEN_ID,
          overrides
        )
      )

      // First, check that the L1 Bridge now owns the L1 NFT
      expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
        env.messenger.contracts.l1.L1ERC721Bridge.address
      )

      // Also check that Bob owns the NFT on L2 initially
      expect(await OptimismMintableERC721.ownerOf(TOKEN_ID)).to.equal(
        bobAddressL1
      )

      const tx = await env.messenger.withdrawERC721(
        L1ERC721.address,
        OptimismMintableERC721.address,
        TOKEN_ID,
        { extra_data }
      )
      await tx.wait()
      await env.relayXDomainMessages(tx)

      // L1 NFT has been sent back to Bob
      expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(bobAddressL1)

      // L2 NFT is burned
      await expect(OptimismMintableERC721.ownerOf(TOKEN_ID)).to.be.reverted

      const foundTokenBridgeMessages =
        await env.messenger.getWithdrawalsByAddress(env.l1Wallet.address)
      const resolved = await env.messenger.toCrossChainMessage(
        foundTokenBridgeMessages[0]
      )
      expect(resolved.transactionHash).to.deep.equal(tx.hash)
    }
  )

  withdrawalTest('bridgeERC721ThenWithdrawTo', async () => {
    // Deposit an NFT into L2 so that there's something to withdraw
    await env.messenger.waitForMessageReceipt(
      await env.messenger.depositERC721(
        L1ERC721.address,
        OptimismMintableERC721.address,
        TOKEN_ID,
        overrides
      )
    )

    // First, check that the L1 Bridge now owns the L1 NFT
    expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
      env.messenger.contracts.l1.L1ERC721Bridge.address
    )

    // Also check that Bob owns the NFT on L2 initially
    expect(await OptimismMintableERC721.ownerOf(TOKEN_ID)).to.equal(
      bobAddressL1
    )

    const tx = await env.messenger.withdrawERC721(
      L1ERC721.address,
      OptimismMintableERC721.address,
      TOKEN_ID,
      { recipient: aliceAddressL1, extra_data }
    )
    await tx.wait()
    await env.relayXDomainMessages(tx)

    // L1 NFT has been sent to Alice
    expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(aliceAddressL1)

    // L2 NFT is burned
    await expect(OptimismMintableERC721.ownerOf(TOKEN_ID)).to.be.reverted
  })

  withdrawalTest(
    'should not allow an arbitrary L2 NFT to be withdrawn in exchange for a legitimate L1 NFT',
    async () => {
      // First, deposit the legitimate L1 NFT.
      await env.messenger.waitForMessageReceipt(
        await env.messenger.depositERC721(
          L1ERC721.address,
          OptimismMintableERC721.address,
          TOKEN_ID,
          overrides
        )
      )
      // Check that the L1 Bridge owns the L1 NFT initially
      expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
        env.messenger.contracts.l1.L1ERC721Bridge.address
      )

      // Deploy a fake L2 ERC721, which:
      // - Returns the address of the legitimate L1 token from its l1Token() getter.
      // - Allows the L2 bridge to call its burn() function.
      const FakeOptimismMintableERC721 = await (
        await ethers.getContractFactory(
          'FakeOptimismMintableERC721',
          bobWalletL2
        )
      ).deploy(
        L1ERC721.address,
        env.messenger.contracts.l2.L2ERC721Bridge.address
      )
      await FakeOptimismMintableERC721.deployed()

      // Use the fake contract to mint Alice an NFT with the same token ID
      const tx = await FakeOptimismMintableERC721.mint(aliceAddressL1, TOKEN_ID)
      await tx.wait()

      // Check that Alice owns the NFT from the fake ERC721 contract
      expect(await FakeOptimismMintableERC721.ownerOf(TOKEN_ID)).to.equal(
        aliceAddressL1
      )

      // Alice withdraws the NFT from the fake contract to L1, hoping to receive the legitimate L1 NFT.
      const withdrawalTx =
        await env.messenger.contracts.l2.L2ERC721Bridge.connect(
          aliceWalletL2
        ).bridgeERC721(
          FakeOptimismMintableERC721.address,
          L1ERC721.address,
          TOKEN_ID,
          0,
          extra_data
        )
      await withdrawalTx.wait()
      await env.relayXDomainMessages(withdrawalTx)

      // The legitimate NFT on L1 is still held in the bridge.
      expect(await L1ERC721.ownerOf(TOKEN_ID)).to.equal(
        env.messenger.contracts.l1.L1ERC721Bridge.address
      )
    }
  )
})
