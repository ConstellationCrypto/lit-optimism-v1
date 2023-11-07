const { ArgumentParser } = require('argparse')
const parse_env = require('./parse-env')
const { ethers, BigNumber } = require('ethers')
var fs = require('fs')
const keyManager = require('@constellation-labs/key-manager')

const parser = new ArgumentParser()
parser.add_argument('--rpc')
parser.add_argument('--l1_fee_wallet_private_key', {
  help: "Prefunded account on the L1 with at enough eth to fund all accounts"
})
parser.add_argument('--config_dir', {
  help: "Location to store configuration files in"
})
parser.add_argument('--kms', { default: 'false' })
parser.add_argument('--load_rollup_from_config', { default: 'false' })
args = parser.parse_args()

let provider = new ethers.providers.JsonRpcProvider(args['rpc'])

const loadRollupFromConfig = args['load_rollup_from_config'] === 'true'
kms = args['kms'] === 'true'
const errorFunc = (err) => { if (err) throw err }


let accountFunding = {
  "DEPLOYER": 1_000,
  "OVM_SEQUENCER": 1,
  "OVM_PROPOSER": 1,
  "GAS_PRICE_ORACLE_OWNER": 0,
  "OVM_ADDRESS_MANAGER_OWNER": 1,
}
accountFunding = parse_env(accountFunding)

async function fundAccounts(wallets) {
  // requiredBalance == adding up all values in accounts, and 0.01 for tx fee
  const requiredBalanceInString = (Object.values(accountFunding).reduce((a, b) => a + b) + 0.01).toString(10)
  const requiredBalance = ethers.utils.parseEther(requiredBalanceInString);
  const funder = new ethers.Wallet(args['l1_fee_wallet_private_key'], provider)
  const funderBalance = await provider.getBalance(funder.address)

  if (funderBalance.lte(requiredBalance)) {
    throw new Error("insufficient funder balance, " + "required: " + ethers.utils.formatEther(requiredBalance) + " actual balance " + ethers.utils.formatEther(funderBalance))
  }

  for (const [account, wallet] of Object.entries(wallets)) {
    const targetBalance = ethers.utils.parseEther(accountFunding[account].toString(10))
    const walletAddress = await wallet.getAddress()
    const currentBalance = await provider.getBalance(walletAddress)
    if (targetBalance.gt(currentBalance)) {
      console.log("account " + account + " currentBalance: " + ethers.utils.formatEther(currentBalance) + " targetBalance: " + ethers.utils.formatEther(targetBalance))
      const amount = targetBalance.sub(currentBalance)
      console.log('funding:', walletAddress, 'with:', ethers.utils.formatEther(amount))
      const tx = await funder.sendTransaction({
        to: walletAddress,
        value: amount
      })
      await tx.wait()
    }
  }
}

async function storeSecret(secret) {
  fs.writeFile(`${args['config_dir']}/secret`, JSON.stringify(secret, null, 2), errorFunc)
}

async function main() {
  let wallets = {}, secret = {}
  if (loadRollupFromConfig) {
    secret = JSON.parse(fs.readFileSync(`${args['config_dir']}/secret`, 'utf8'))
  }
  for (const [account, _] of Object.entries(accountFunding)) {
    let wallet
    if (kms && account === 'OVM_SEQUENCER') {
      const keyId = '9151e6ee-29ae-4470-897e-edd391d4dd8d'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      wallets[account] = wallet
      secret[account] = keyId
    }
    else if (kms && account === 'OVM_PROPOSER') {
      const keyId = '5f917a8e-6b2f-4f63-b9ef-aa614756a1ed'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      wallets[account] = wallet
      secret[account] = keyId
    }
    else if (kms && account === 'OVM_ADDRESS_MANAGER_OWNER') {
      const keyId = 'f89546f4-0a32-45ad-8fb6-14747dd13fac'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      wallets[account] = wallet
      secret[account] = keyId
    }
    else {
      wallet = loadRollupFromConfig ? new ethers.Wallet(secret[account]) : new ethers.Wallet.createRandom()
      wallets[account] = wallet
      secret[account] = wallet.privateKey
    }
  }
  if (!loadRollupFromConfig) {
    await fundAccounts(wallets)
    await storeSecret(secret)
  }
  for (let [account, wallet] of Object.entries(wallets)) {
    if (kms && account === 'OVM_SEQUENCER') {
      const keyId = '9151e6ee-29ae-4470-897e-edd391d4dd8d'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, keyId, errorFunc)
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, await wallet.getAddress(), errorFunc)
    }
    else if (kms && account === 'OVM_PROPOSER') {
      const keyId = '5f917a8e-6b2f-4f63-b9ef-aa614756a1ed'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, keyId, errorFunc)
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, await wallet.getAddress(), errorFunc)
    }
    else if (kms && account === 'GAS_PRICE_ORACLE_OWNER') {
      const keyId = '8c720f8e-417a-4536-8af9-0cf4549cf7ff'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, keyId, errorFunc)
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, await wallet.getAddress(), errorFunc)
    }
    else if (kms && account === 'GAS_PRICE_ORACLE_OWNER') {
      const keyId = '8c720f8e-417a-4536-8af9-0cf4549cf7ff'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, keyId, errorFunc)
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, await wallet.getAddress(), errorFunc)
    }
    else if (kms && account === 'OVM_ADDRESS_MANAGER_OWNER') {
      const keyId = 'f89546f4-0a32-45ad-8fb6-14747dd13fac'
      wallet = new keyManager.AwsKmsSigner({ region: 'us-west-2', keyId })
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, keyId, errorFunc)
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, await wallet.getAddress(), errorFunc)
    }
    else {
      // save private key
      fs.writeFile(`${args['config_dir']}/keys/${account}-priv.txt`, wallet.privateKey.slice(2), errorFunc)
      // save address
      fs.writeFile(`${args['config_dir']}/keys/${account}-addr.txt`, wallet.address, errorFunc)
    }
  }
}

main()
