/* Imports: External */
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
/* Imports: Internal */
import Artifact_FPE_GasPriceOracle from '@constellation-labs/contracts/artifacts/contracts/L2/predeploys/FPE_GasPriceOracle.sol/FPE_GasPriceOracle.json'
import { predeploys } from '@constellation-labs/contracts'

import { OptimismEnv } from './shared/env'
import { envConfig } from './shared/utils'

describe('CONSTELLATION FPE_GasPriceOracle', () => {
  before(async function () {
    if (!envConfig.TEST_FPE) {
      this.skip()
    }
  })

  let env: OptimismEnv
  before(async () => {
    env = await OptimismEnv.new()
  })

  let FPE_GasPriceOracle: Contract
  before(async () => {
    FPE_GasPriceOracle = new ethers.Contract(
      predeploys.FPE_GasPriceOracle,
      Artifact_FPE_GasPriceOracle.abi,
      env.l2Wallet
    )
  })
  it('Print some info:', async () => {
    console.log('Owner:', await FPE_GasPriceOracle.owner())
    console.log(
      'priceRatio:',
      (await FPE_GasPriceOracle.priceRatio()).toString()
    )
    console.log(
      'minPriceRatio:',
      (await FPE_GasPriceOracle.minPriceRatio()).toString()
    )
    console.log(
      'maxPriceRatio:',
      (await FPE_GasPriceOracle.maxPriceRatio()).toString()
    )
  })
})
