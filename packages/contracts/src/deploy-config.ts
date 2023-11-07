import { utils } from 'ethers'
import '@constellation-labs/hardhat-deploy-config'
import { cleanEnv, str, num, bool, makeValidator } from 'envalid'
import dotenv from 'dotenv'
dotenv.config()

const addressValidator = makeValidator((addr) => {
  if (!addr) {
    return ''
  } else if (utils.isAddress(addr)) {
    return addr
  } else {
    throw new Error('Expected an address')
  }
})

export const deployConfig = JSON.parse(
  JSON.stringify(
    cleanEnv(process.env, {
      IS_FORKED_NETWORK: bool({ default: false }),
      NUM_DEPLOYMENT_CONFIRMATIONS: num({ default: 1 }),
      GAS_PRICE: num({ default: 0 }),
      L2_BLOCK_GAS_LIMIT: num({ default: undefined }),
      L2_CHAIN_ID: num({ default: undefined }),
      CTC_L2_GAS_DISCOUNT_DIVISOR: num({ default: undefined }),
      CTC_ENQUEUE_GAS_COST: num({ default: undefined }),
      SCC_FAULT_PROOF_WINDOW_SECONDS: num({ default: undefined }),
      SCC_SEQUENCER_PUBLISH_WINDOW_SECONDS: num({ default: undefined }),
      OVM_SEQUENCER_ADDRESS: addressValidator({ default: undefined }),
      OVM_PROPOSER_ADDRESS: addressValidator({ default: undefined }),
      OVM_BLOCK_SIGNER_ADDRESS: addressValidator({ default: undefined }),
      OVM_FEE_WALLET_ADDRESS: addressValidator({ default: undefined }),
      OVM_ADDRESS_MANAGER_OWNER: addressValidator({ default: undefined }),
      OVM_GAS_PRICE_ORACLE_OWNER: addressValidator({ default: undefined }),
      OVM_WHITELIST_OWNER: addressValidator({
        default: '0x0000000000000000000000000000000000000000',
      }),
      GAS_PRICE_ORACLE_OVERHEAD: num({ default: 2750 }),
      GAS_PRICE_ORACLE_SCALAR: num({ default: 1_500_000 }),
      GAS_PRICE_ORACLE_DECIMALS: num({ default: 6 }),
      GAS_PRICE_ORACLE_L1_BASE_FEE: num({ default: 1 }),
      GAS_PRICE_ORACLE_L2_GAS_PRICE: num({ default: 1 }),
      HF_BERLIN_BLOCK: num({ default: 0 }),
      TEST_FPE: bool({ default: false }),
      L1_FPE_ADDRESS: addressValidator({
        default: '0x0000000000000000000000000000000000000000',
      }),
      FPE_MIN_PRICE_RATIO: num({ default: 1 }),
      FPE_PRICE_RATIO: num({ default: 1 }),
      FPE_MAX_PRICE_RATIO: num({ default: 1 }),
      FPE_PRICE_RATIO_DECIMALS: num({ default: 6 }),
      FPE_TOKEN_NAME: str({ default: 'temp' }),
      FPE_TOKEN_SYMBOL: str({ default: 't' }),
      L1_TOKEN_NAME: str({ default: 'Ether' }),
      L1_TOKEN_SYMBOL: str({ default: 'ETH' }),
    })
  )
)
