import express from 'express'
const app = express()

app.get('/valid-address-json', (_, res) => {
  res
    .json({
      ChugSplashDictator__Proxy__ERC721Bridge:
        '0xe5894810F34D42E9dbd6181FB249fF0a2122E690',
      ChugSplashDictator: '0xE0eEbD35B952c9C73a187edA3D669d9BcFD79006',
      Proxy__OVM_L1CrossDomainMessenger:
        '0x80F43505d8d1A739504eB4237Eb15b2e0048Da8d',
      L1_FPE: '0x521fe809562DCDE295A48D017b4571d1cA15041E',
      Proxy__OVM_L1StandardBridge: '0xded2cB506a7374B9645726565b1bD790E605B7b1',
      BondManager: '0x993F00eb9C73e3E4eAe3d6Afb4Ba65A6b8B5E597',
      CanonicalTransactionChain: '0x31A65C6d4EB07ad51E7afc890aC3b7bE84dF2Ead',
      OVM_L1CrossDomainMessenger: '0xd771D7C0e1EBE89C9E9F663824851BB89b926d1a',
      'ChainStorageContainer-CTC-batches':
        '0x9bAaB117304f7D6517048e371025dB8f89a8DbE5',
      StateCommitmentChain: '0x2706A171ECb68E0038378D40Dd1d136361d0cB7d',
      AddressDictator: '0xBDcCd14B9D7299aABe2A46A9cAF0c2d3c384909e',
      Lib_AddressManager: '0x0116686E2291dbd5e317F47faDBFb43B599786Ef',
      Proxy__L1ERC721Bridge: '0xEfDC2a236Dba7a8f60726b49abC79Ee6b22Ed445',
      'ChainStorageContainer-SCC-batches':
        '0x1Eb835EB7BEEEE9E6bbFe08F16a2d2eF668204bd',
      AddressManager: '0x0116686E2291dbd5e317F47faDBFb43B599786Ef',
    })
    .send()
})

app.get('/invalid-addresses', (_, res) => {
  // Missing an entry for AddressManager, which is required
  res
    .json({
      Proxy__OVM_L1CrossDomainMessenger:
        '0x80F43505d8d1A739504eB4237Eb15b2e0048Da8d',
      Proxy__OVM_L1StandardBridge: '0xded2cB506a7374B9645726565b1bD790E605B7b1',
      BondManager: '0x993F00eb9C73e3E4eAe3d6Afb4Ba65A6b8B5E597',
      CanonicalTransactionChain: '0x31A65C6d4EB07ad51E7afc890aC3b7bE84dF2Ead',
      StateCommitmentChain: '0x2706A171ECb68E0038378D40Dd1d136361d0cB7d',
    })
    .send()
})

export default app
