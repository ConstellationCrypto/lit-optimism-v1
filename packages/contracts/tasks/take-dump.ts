import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

import * as mkdirp from 'mkdirp'
import { ethers } from 'ethers'
import { task } from 'hardhat/config'
import { remove0x } from '@constellation-labs/core-utils'

import { predeploys } from '../src/predeploys'
import { getContractFromArtifact } from '../src/deploy-utils'
import { names } from '../src/address-names'

task('take-dump').setAction(async (args, hre) => {
  /* eslint-disable @typescript-eslint/no-var-requires */

  // Needs to be imported here or hardhat will throw a fit about hardhat being imported from
  // within the configuration file.
  const {
    computeStorageSlots,
    getStorageLayout,
  } = require('@defi-wonderland/smock/dist/src/utils')

  // Needs to be imported here because the artifacts can only be generated after the contracts have
  // been compiled, but compiling the contracts will import the config file which, as a result,
  // will import this file.
  const { getContractArtifact } = require('../src/contract-artifacts')

  /* eslint-enable @typescript-eslint/no-var-requires */

  // Basic warning so users know that the whitelist will be disabled if the owner is the zero address.
  if (
    hre.deployConfig.OVM_WHITELIST_OWNER === undefined ||
    hre.deployConfig.OVM_WHITELIST_OWNER === ethers.constants.AddressZero
  ) {
    console.log(
      'WARNING: whitelist owner is undefined or address(0), whitelist will be disabled'
    )
  }

  const variables = {
    OVM_DeployerWhitelist: {
      owner: hre.deployConfig.OVM_WHITELIST_OWNER,
    },
    OVM_GasPriceOracle: {
      _owner: hre.deployConfig.OVM_GAS_PRICE_ORACLE_OWNER,
      gasPrice: hre.deployConfig.GAS_PRICE_ORACLE_L2_GAS_PRICE,
      l1BaseFee: hre.deployConfig.GAS_PRICE_ORACLE_L1_BASE_FEE,
      overhead: hre.deployConfig.GAS_PRICE_ORACLE_OVERHEAD,
      scalar: hre.deployConfig.GAS_PRICE_ORACLE_SCALAR,
      decimals: hre.deployConfig.GAS_PRICE_ORACLE_DECIMALS,
    },
    L2StandardBridge: {
      l1TokenBridge: (
        await getContractFromArtifact(
          hre,
          names.managed.contracts.Proxy__OVM_L1StandardBridge
        )
      ).address,
      messenger: predeploys.L2CrossDomainMessenger,
    },
    L2ERC721Bridge: {
      otherBridge: (
        await getContractFromArtifact(
          hre,
          names.managed.contracts.Proxy__L1ERC721Bridge
        )
      ).address,
      messenger: predeploys.L2CrossDomainMessenger,
    },
    OptimismMintableERC721Factory: {
      bridge: predeploys.L2ERC721Bridge,
    },
    L2_FPE: {
      l2Bridge: predeploys.L2StandardBridge,
      l1Token: hre.deployConfig.TEST_FPE
        ? (await getContractFromArtifact(hre, names.unmanaged.L1_FPE)).address
        : hre.deployConfig.L1_FPE_ADDRESS,
      _name: hre.deployConfig.FPE_TOKEN_NAME,
      _symbol: hre.deployConfig.FPE_TOKEN_SYMBOL,
    },
    OVM_SequencerFeeVault: {
      l1FeeWallet: hre.deployConfig.OVM_FEE_WALLET_ADDRESS,
    },
    OVM_ETH: {
      l2Bridge: predeploys.L2StandardBridge,
      l1Token: ethers.constants.AddressZero,
      _name: hre.deployConfig.L1_TOKEN_NAME,
      _symbol: hre.deployConfig.L1_TOKEN_SYMBOL,
    },
    L2CrossDomainMessenger: {
      // We default the xDomainMsgSender to this value to save gas.
      // See usage of this default in the L2CrossDomainMessenger contract.
      xDomainMsgSender: '0x000000000000000000000000000000000000dEaD',
      l1CrossDomainMessenger: (
        await getContractFromArtifact(
          hre,
          names.managed.contracts.Proxy__OVM_L1CrossDomainMessenger
        )
      ).address,
      // Set the messageNonce to a high value to avoid overwriting old sent messages.
      messageNonce: 100000,
    },
    WETH9: {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
    },
    FPE_GasPriceOracle: {
      _owner: hre.deployConfig.OVM_GAS_PRICE_ORACLE_OWNER,
      l1FeeWallet: hre.deployConfig.OVM_FEE_WALLET_ADDRESS,
      l2FPEAddress: predeploys.L2_FPE,
      minPriceRatio: hre.deployConfig.FPE_MIN_PRICE_RATIO,
      priceRatio: hre.deployConfig.FPE_PRICE_RATIO,
      maxPriceRatio: hre.deployConfig.FPE_MAX_PRICE_RATIO,
      priceRatioDecimals: hre.deployConfig.FPE_PRICE_RATIO_DECIMALS,
      gasPriceOracleAddress: predeploys.OVM_GasPriceOracle,
      usingFeePayingERC20: false,
    },
  }

  const dump = {}
  for (const predeployName of Object.keys(predeploys)) {
    const predeployAddress = predeploys[predeployName]
    dump[predeployAddress] = {
      balance: '00',
      storage: {},
    }

    if (predeployName === 'OVM_L1BlockNumber') {
      // OVM_L1BlockNumber is a special case where we just inject a specific bytecode string.
      // We do this because it uses the custom L1BLOCKNUMBER opcode (0x4B) which cannot be
      // directly used in Solidity (yet). This bytecode string simply executes the 0x4B opcode
      // and returns the address given by that opcode.
      dump[predeployAddress].code = '0x4B60005260206000F3'
    } else {
      const artifact = getContractArtifact(predeployName)
      dump[predeployAddress].code = artifact.deployedBytecode
    }

    // Compute and set the required storage slots for each contract that needs it.
    if (predeployName in variables) {
      const storageLayout = await getStorageLayout(predeployName)
      const slots = computeStorageSlots(storageLayout, variables[predeployName])
      for (const slot of slots) {
        dump[predeployAddress].storage[slot.key] = slot.val
      }
    }
  }

  // Grab the commit hash so we can stick it in the genesis file.
  let commit: string
  try {
    const { stdout } = await promisify(exec)('git rev-parse HEAD')
    commit = stdout.replace('\n', '')
  } catch {
    console.log('unable to get commit hash, using empty hash instead')
    commit = '0000000000000000000000000000000000000000'
  }
  const genesis = {
    commit,
    config: {
      chainId: hre.deployConfig.L2_CHAIN_ID,
      homesteadBlock: 0,
      eip150Block: 0,
      eip155Block: 0,
      eip158Block: 0,
      byzantiumBlock: 0,
      constantinopleBlock: 0,
      petersburgBlock: 0,
      istanbulBlock: 0,
      muirGlacierBlock: 0,
      berlinBlock: hre.deployConfig.HF_BERLIN_BLOCK,
      caldera0Block: 10, // for integration test, should be 0 for other chains than lit protocol
      clique: {
        period: 0,
        epoch: 30000,
      },
    },
    difficulty: '1',
    gasLimit: hre.deployConfig.L2_BLOCK_GAS_LIMIT.toString(10),
    extradata:
      '0x' +
      '00'.repeat(32) +
      remove0x(hre.deployConfig.OVM_BLOCK_SIGNER_ADDRESS) +
      '00'.repeat(65),
    alloc: dump,
  }

  // Make sure the output location exists
  const outdir = path.resolve(__dirname, '../genesis')
  const outfile = path.join(outdir, `${hre.network.name}.json`)
  mkdirp.sync(outdir)

  // Write the genesis file
  fs.writeFileSync(outfile, JSON.stringify(genesis, null, 4))
})
