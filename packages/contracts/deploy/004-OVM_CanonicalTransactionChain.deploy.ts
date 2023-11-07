/* Imports: External */
import { DeployFunction } from 'hardhat-deploy/dist/types'

/* Imports: Internal */
import {
  deployAndVerifyAndThen,
  getContractFromArtifact,
} from '../src/deploy-utils'
import { names } from '../src/address-names'

const deployFn: DeployFunction = async (hre) => {
  const Lib_AddressManager = await getContractFromArtifact(
    hre,
    names.unmanaged.Lib_AddressManager
  )

  await deployAndVerifyAndThen({
    hre,
    name: names.managed.contracts.CanonicalTransactionChain,
    args: [
      Lib_AddressManager.address,
      hre.deployConfig.L2_BLOCK_GAS_LIMIT,
      hre.deployConfig.CTC_L2_GAS_DISCOUNT_DIVISOR,
      hre.deployConfig.CTC_ENQUEUE_GAS_COST,
    ],
  })
}

deployFn.tags = ['CanonicalTransactionChain', 'upgrade']

export default deployFn
