/* Imports: External */
import { DeployFunction } from 'hardhat-deploy/dist/types'

/* Imports: Internal */
import { deployAndVerifyAndThen } from '../src/deploy-utils'
import { names } from '../src/address-names'

const deployFn: DeployFunction = async (hre) => {
  const { deployer } = await hre.getNamedAccounts()

  await deployAndVerifyAndThen({
    hre,
    name: names.managed.contracts.Proxy__L1ERC721Bridge,
    contract: 'L1ChugSplashProxy',
    iface: 'L1ERC721Bridge',
    args: [deployer],
  })
}

deployFn.tags = ['Proxy__L1ERC721Bridge']

export default deployFn
