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
    name: names.managed.contracts.StateCommitmentChain,
    args: [
      Lib_AddressManager.address,
      hre.deployConfig.SCC_FAULT_PROOF_WINDOW_SECONDS,
      hre.deployConfig.SCC_SEQUENCER_PUBLISH_WINDOW_SECONDS,
    ],
  })
}

deployFn.tags = ['StateCommitmentChain', 'upgrade']

export default deployFn
