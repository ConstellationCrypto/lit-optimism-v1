/* Imports: External */
import { DeployFunction } from 'hardhat-deploy/dist/types'

/* Imports: Internal */
import { deployAndVerifyAndThen } from '../src/deploy-utils'
import { names } from '../src/address-names'

const deployFn: DeployFunction = async (hre) => {
  if (hre.deployConfig.TEST_FPE) {
    await deployAndVerifyAndThen({
      hre,
      name: names.unmanaged.L1_FPE,
      contract: 'L1_FPE',
      args: ['CI token', 'CI', 500_000_000],
    })
  }
}

deployFn.tags = ['L1_FPE']

export default deployFn
