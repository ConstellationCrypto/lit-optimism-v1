/* Imports: External */
import { sleep } from '@constellation-labs/core-utils'
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { defaultHardhatNetworkHdAccountsConfigParams } from 'hardhat/internal/core/config/default-config'
import { normalizeHardhatNetworkAccountsConfig } from 'hardhat/internal/core/providers/util'

/* Imports: Internal */
import { getContractFromArtifact } from '../src/deploy-utils'
import { names } from '../src/address-names'

// This is a TEMPORARY way to fund the default hardhat accounts on L2. The better way to do this is
// to make a modification to hardhat-ovm. However, I don't have the time right now to figure the
// details of how to make that work cleanly. This is fine in the meantime.
const deployFn: DeployFunction = async (hre) => {
  let accounts
  const { chainId } = await hre.ethers.provider.getNetwork()
  /*
    Set the account to be funded based on the chain ID
    make sure this account has eth on the L1. This deploy script will bridge half
    the balance of the account over to the L2. This stuff is fine for now, but
    switch to env variables
    */
  if (chainId === 31337) {
    // hardhat
    accounts = normalizeHardhatNetworkAccountsConfig(
      defaultHardhatNetworkHdAccountsConfigParams
    ).slice(0, 20)
  } else {
    accounts = [
      {
        privateKey: process.env.CONTRACTS_DEPLOYER_KEY,
      },
    ]
  }

  const L1StandardBridge = await getContractFromArtifact(
    hre,
    names.managed.contracts.Proxy__OVM_L1StandardBridge,
    {
      iface: 'L1StandardBridge',
    }
  )

  // Default has 20 accounts but we restrict to 20 accounts manually as well just to prevent
  // future problems if the number of default accounts increases for whatever reason.
  // Fund the accounts in parallel to speed things up.
  await Promise.all(
    accounts.map(async (account, index) => {
      // Add a sleep here to avoid any potential issues with spamming hardhat. Not sure if this
      // is strictly necessary but it can't hurt.
      await sleep(200 * index)

      const wallet = new hre.ethers.Wallet(
        account.privateKey,
        hre.ethers.provider
      )
      const balance = await wallet.getBalance()
      const depositAmount = balance.div(8) // Deposit half of the wallet's balance into L2.
      await L1StandardBridge.connect(wallet).depositETH(8_000_000, '0x', {
        value: depositAmount,
        gasLimit: 2_000_000, // Idk, gas estimation was broken and this fixes it.,
        gasPrice: (await hre.ethers.provider.getGasPrice()).mul(12).div(10),
      })
      await L1StandardBridge.connect(wallet).depositETH(8_000_000, '0x', {
        value: depositAmount,
        gasLimit: 2_000_000, // Idk, gas estimation was broken and this fixes it.,
        gasPrice: (await hre.ethers.provider.getGasPrice()).mul(12).div(10),
      })
      console.log(
        `✓ Funded ${wallet.address} on L2 with ${hre.ethers.utils.formatEther(
          depositAmount
        )} ETH`
      )
    })
  )
}

deployFn.tags = ['fund-accounts']

export default deployFn
