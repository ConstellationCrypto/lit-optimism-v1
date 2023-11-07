/* Imports: External */
import { ethers, ContractFactory } from 'ethers'
import { task } from 'hardhat/config'
import * as types from 'hardhat/internal/core/params/argumentTypes'

import { getContractFactory } from '../src'

task('deploy-pause-module')
  .addParam(
    'safeAddress',
    'Address of the linked Gnosis safe.',
    undefined,
    types.string
  )
  .addParam(
    'l1CrossDomainMessengerAddress',
    'Address of the corresponding cross domain messenger contract',
    undefined,
    types.string
  )
  .addParam(
    'rpcUrl',
    'RPC endpoint',
    process.env.CONTRACTS_RPC_URL,
    types.string
  )
  .addParam(
    'pKey',
    'Private Key',
    process.env.CONTRACTS_DEPLOYER_KEY,
    types.string
  )
  .addOptionalParam(
    'numDeployConfirmations',
    'Number of confirmations to wait for each transaction in the deployment. More is safer.',
    1,
    types.int
  )
  .addOptionalParam(
    'gasPrice',
    'Gas price to use for the deployment transaction',
    undefined,
    types.int
  )
  .setAction(
    async ({
      safeAddress,
      l1CrossDomainMessengerAddress,
      numDeployConfirmations,
      pKey,
      rpcUrl,
      gasPrice,
    }) => {
      const deployer = new ethers.Wallet(
        pKey,
        new ethers.providers.JsonRpcProvider(rpcUrl)
      )
      console.log('Deploying PauseModule... ')
      const PauseModule: ContractFactory =
        getContractFactory('PauseModule').connect(deployer)

      const contract = await PauseModule.deploy(
        safeAddress,
        l1CrossDomainMessengerAddress,
        { gasPrice }
      )
      await contract.deployTransaction.wait(numDeployConfirmations)
      console.log('PauseModule successfully deployed at:', contract.address)
    }
  )
