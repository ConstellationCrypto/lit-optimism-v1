/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@constellation-labs/hardhat-deploy-config'

const deployFn: DeployFunction = async (hre) => {
  const { deploy } = hre.deployments
  const { deployer } = await hre.getNamedAccounts()
  const { deployConfig } = hre

  await deploy('L1CrossDomainMessengerProxy', {
    contract: 'Proxy',
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: deployConfig.deploymentWaitConfirmations,
  })

  await deploy('L1CrossDomainMessenger', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: deployConfig.deploymentWaitConfirmations,
  })

  const proxy = await hre.deployments.get('L1CrossDomainMessengerProxy')
  const Proxy = await hre.ethers.getContractAt('Proxy', proxy.address)
  const messenger = await hre.deployments.get('L1CrossDomainMessenger')
  const portal = await hre.deployments.get('OptimismPortal')

  const L1CrossDomainMessenger = await hre.ethers.getContractAt(
    'L1CrossDomainMessenger',
    proxy.address
  )

  const upgradeTx = await Proxy.upgradeToAndCall(
    messenger.address,
    L1CrossDomainMessenger.interface.encodeFunctionData('initialize(address)', [
      portal.address,
    ])
  )
  await upgradeTx.wait()

  const portalAddress = await L1CrossDomainMessenger.portal()
  if (portalAddress !== portal.address) {
    throw new Error('portal misconfigured')
  }
}

deployFn.tags = ['L1CrossDomainMessenger']

export default deployFn
