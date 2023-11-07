/* External Imports */
import { ethers } from 'hardhat'
import { ContractFactory, Contract, Signer } from 'ethers'
import { calculateL1Fee } from '@constellation-labs/core-utils'

import { expect } from '../../../setup'

describe('FPE_GasPriceOracle', () => {
  let signer1: Signer
  let signer2: Signer
  let address1: string
  let address2: string
  before(async () => {
    ;[signer1, signer2] = await ethers.getSigners()
    address1 = ethers.Wallet.createRandom().address
    address2 = ethers.Wallet.createRandom().address
  })

  let Factory__FPE_GasPriceOracle: ContractFactory
  let Factory__OVM_GasPriceOracle: ContractFactory
  before(async () => {
    Factory__FPE_GasPriceOracle = await ethers.getContractFactory(
      'FPE_GasPriceOracle'
    )
    Factory__OVM_GasPriceOracle = await ethers.getContractFactory(
      'OVM_GasPriceOracle'
    )
  })

  let FPE_GasPriceOracle: Contract
  let OVM_GasPriceOracle: Contract
  beforeEach(async () => {
    FPE_GasPriceOracle = await Factory__FPE_GasPriceOracle.deploy()
    await FPE_GasPriceOracle.initialize(address1, address2)
    OVM_GasPriceOracle = await Factory__OVM_GasPriceOracle.deploy(
      await signer1.getAddress()
    )

    OVM_GasPriceOracle.setOverhead(2750)
    OVM_GasPriceOracle.setScalar(1500000)
    OVM_GasPriceOracle.setDecimals(6)
  })

  describe('owner', () => {
    it('should have an owner', async () => {
      expect(await FPE_GasPriceOracle.owner()).to.equal(
        await signer1.getAddress()
      )
    })
    it('should transfer ownership', async () => {
      const signer1Address = await signer1.getAddress()
      const signer2Address = await signer2.getAddress()
      await FPE_GasPriceOracle.connect(signer1).transferOwnership(
        signer2Address
      )
      expect(await FPE_GasPriceOracle.owner()).to.equal(signer2Address)

      await FPE_GasPriceOracle.connect(signer2).transferOwnership(
        signer1Address
      )
      expect(await FPE_GasPriceOracle.owner()).to.equal(signer1Address)
    })
    it('should revert if called by someone other than the owner', async () => {
      const signer1Address = await signer1.getAddress()
      await expect(
        FPE_GasPriceOracle.connect(signer2).transferOwnership(signer1Address)
      ).to.be.reverted
    })
    it('should revert if ownership is transferred to zero address', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer2).transferOwnership(
          ethers.constants.AddressZero
        )
      ).to.be.reverted
    })
  })

  describe('initialize', () => {
    it('should revert if contract has been initialized', async () => {
      const signer1Address = await signer1.getAddress()
      await expect(
        FPE_GasPriceOracle.connect(signer1).initialize(
          signer1Address,
          signer1Address
        )
      ).to.be.reverted
    })
  })

  describe('setPriceRatio', () => {
    it('should revert if called by someone other than the owner', async () => {
      await expect(FPE_GasPriceOracle.connect(signer2).setPriceRatio(1234)).to
        .be.reverted
    })

    it('should succeed if called by the owner and is equal to `1234`', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setPriceRatio(1234)).to
        .not.be.reverted
    })

    it('should emit event', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setPriceRatio(1234))
        .to.emit(FPE_GasPriceOracle, 'SetPriceRatio')
        .withArgs(await signer1.getAddress(), 1234)
    })
  })

  describe('get priceRatio', () => {
    it('should change when priceRatio is called', async () => {
      const priceRatio = 1234

      await FPE_GasPriceOracle.connect(signer1).setPriceRatio(priceRatio)

      expect(await FPE_GasPriceOracle.priceRatio()).to.equal(priceRatio)
    })

    it('is the 6th storage slot', async () => {
      const priceRatio = 2222
      const slot = 6

      // set the price
      await FPE_GasPriceOracle.connect(signer1).setPriceRatio(priceRatio)

      // get the storage slot value
      const priceRatioAtSlot = await signer1.provider.getStorageAt(
        FPE_GasPriceOracle.address,
        slot
      )
      expect(await FPE_GasPriceOracle.priceRatio()).to.equal(
        ethers.BigNumber.from(priceRatioAtSlot)
      )
    })
  })

  describe('maxPriceRatio', () => {
    it('should revert if called by someone other than the owner', async () => {
      await expect(FPE_GasPriceOracle.connect(signer2).setMaxPriceRatio(6000))
        .to.be.reverted
    })

    it('should revert if maxPriceRatio is smaller than minPriceRatio', async () => {
      const minPriceRatio = await FPE_GasPriceOracle.minPriceRatio()
      await expect(
        FPE_GasPriceOracle.connect(signer1).setMaxPriceRatio(
          minPriceRatio.toNumber() - 1
        )
      ).to.be.reverted
    })

    it('should succeed if called by the owner', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setMaxPriceRatio(6500))
        .to.not.be.reverted
    })

    it('should emit event', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setMaxPriceRatio(6000))
        .to.emit(FPE_GasPriceOracle, 'SetMaxPriceRatio')
        .withArgs(await signer1.getAddress(), 6000)
    })
  })

  describe('get maxPriceRatio', () => {
    it('should change when maxPriceRatio is called', async () => {
      const maxPriceRatio = 6000
      await FPE_GasPriceOracle.connect(signer1).setMaxPriceRatio(maxPriceRatio)
      expect(await FPE_GasPriceOracle.maxPriceRatio()).to.equal(maxPriceRatio)
    })

    it('is the 3rd storage slot', async () => {
      const maxPriceRatio = 12345
      const slot = 3

      // set the price
      await FPE_GasPriceOracle.connect(signer1).setMaxPriceRatio(maxPriceRatio)

      // get the storage slot value
      const priceAtSlot = await signer1.provider.getStorageAt(
        FPE_GasPriceOracle.address,
        slot
      )
      expect(await FPE_GasPriceOracle.maxPriceRatio()).to.equal(
        ethers.BigNumber.from(priceAtSlot)
      )
    })
  })

  describe('minPriceRatio', () => {
    it('should revert if called by someone other than the owner', async () => {
      await expect(FPE_GasPriceOracle.connect(signer2).setMinPriceRatio(600)).to
        .be.reverted
    })

    it('should revert if minPriceRatio is larger than maxPriceRatio', async () => {
      const minPriceRatio = await FPE_GasPriceOracle.maxPriceRatio()
      await expect(
        FPE_GasPriceOracle.connect(signer1).setMinPriceRatio(
          minPriceRatio.toNumber() + 1
        )
      ).to.be.reverted
    })

    it('should succeed if called by the owner', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setMinPriceRatio(650)).to
        .not.be.reverted
    })

    it('should emit event', async () => {
      await expect(FPE_GasPriceOracle.connect(signer1).setMinPriceRatio(600))
        .to.emit(FPE_GasPriceOracle, 'SetMinPriceRatio')
        .withArgs(await signer1.getAddress(), 600)
    })
  })

  describe('get minPriceRatio', () => {
    it('should change when minPriceRatio is called', async () => {
      const minPriceRatio = 600
      await FPE_GasPriceOracle.connect(signer1).setMinPriceRatio(minPriceRatio)
      expect(await FPE_GasPriceOracle.minPriceRatio()).to.equal(minPriceRatio)
    })

    it('is the 4th storage slot', async () => {
      const minPriceRatio = 650
      const slot = 4

      // set the price
      await FPE_GasPriceOracle.connect(signer1).setMinPriceRatio(minPriceRatio)

      // get the storage slot value
      const priceAtSlot = await signer1.provider.getStorageAt(
        FPE_GasPriceOracle.address,
        slot
      )
      expect(await FPE_GasPriceOracle.minPriceRatio()).to.equal(
        ethers.BigNumber.from(priceAtSlot)
      )
    })
  })

  describe('gasPriceOracleAddress', () => {
    it('should revert if called by someone other than the owner', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer2).updateGasPriceOracleAddress(
          address1
        )
      ).to.be.reverted
    })

    it('should revert if the new address is address(0)', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer1).updateGasPriceOracleAddress(
          ethers.constants.AddressZero
        )
      ).to.be.reverted
    })

    it('should succeed if called by the owner', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer1).updateGasPriceOracleAddress(
          OVM_GasPriceOracle.address
        )
      ).to.not.be.reverted
    })

    it('should emit event', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer1).updateGasPriceOracleAddress(
          OVM_GasPriceOracle.address
        )
      )
        .to.emit(FPE_GasPriceOracle, 'UpdateGasPriceOracleAddress')
        .withArgs(await signer1.getAddress(), OVM_GasPriceOracle.address)
    })
  })

  describe('get gasPriceOracleAddress', () => {
    it('should revert if gasPriceOracleAddress is not EOA', async () => {
      await expect(
        FPE_GasPriceOracle.connect(signer2).updateGasPriceOracleAddress(
          address1
        )
      ).to.be.reverted
    })
    it('should change when gasPriceOracleAddress is called', async () => {
      await FPE_GasPriceOracle.connect(signer1).updateGasPriceOracleAddress(
        OVM_GasPriceOracle.address
      )
      expect(await FPE_GasPriceOracle.gasPriceOracleAddress()).to.equal(
        OVM_GasPriceOracle.address
      )
    })

    it('is the 8th storage slot', async () => {
      const gasPriceOracleAddress = OVM_GasPriceOracle.address
      const slot = 8

      // set the price
      await FPE_GasPriceOracle.connect(signer1).updateGasPriceOracleAddress(
        gasPriceOracleAddress
      )

      // get the storage slot value
      const priceAtSlot = await signer1.provider.getStorageAt(
        FPE_GasPriceOracle.address,
        slot
      )
      expect(await FPE_GasPriceOracle.gasPriceOracleAddress()).to.equal(
        ethers.BigNumber.from(priceAtSlot)
      )
    })
  })

  describe('priceRatioDecimals', () => {
    it('is the 7th storage slot', async () => {
      expect(await FPE_GasPriceOracle.priceRatioDecimals()).to.equal(
        ethers.BigNumber.from(
          await signer1.provider.getStorageAt(FPE_GasPriceOracle.address, 7)
        )
      )
    })
    it('setter function works properly', async () => {
      const priceRatioDecimals = 9
      await FPE_GasPriceOracle.connect(signer1).setPriceRatioDecimals(
        priceRatioDecimals
      )
      expect(await FPE_GasPriceOracle.priceRatioDecimals()).to.equal(
        priceRatioDecimals
      )
    })
  })

  // Test cases for gas estimation
  const inputs = [
    '0x',
    '0x00',
    '0x01',
    '0x0001',
    '0x0101',
    '0xffff',
    '0x00ff00ff00ff00ff00ff00ff',
  ]

  describe('getL1FPEFee', async () => {
    for (const input of inputs) {
      it(`case: ${input}`, async () => {
        await OVM_GasPriceOracle.setGasPrice(1)
        await OVM_GasPriceOracle.setL1BaseFee(1)
        const decimals = await OVM_GasPriceOracle.decimals()
        const overhead = await OVM_GasPriceOracle.overhead()
        const scalar = await OVM_GasPriceOracle.scalar()
        const l1BaseFee = await OVM_GasPriceOracle.l1BaseFee()

        const tx = await FPE_GasPriceOracle.updateGasPriceOracleAddress(
          OVM_GasPriceOracle.address
        )
        await tx.wait()
        const priceRatio = await FPE_GasPriceOracle.priceRatio()
        const FPEFee = await FPE_GasPriceOracle.getL1FPEFee(input)

        const expected = calculateL1Fee(
          input,
          overhead,
          l1BaseFee,
          scalar,
          decimals
        ).mul(priceRatio)
        expect(FPEFee).to.deep.equal(expected)
      })
    }
  })
})
