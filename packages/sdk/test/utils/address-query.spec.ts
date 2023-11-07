import { expect } from '../setup'
import { queryL1Contracts } from '../../src/utils/address-query'
import app from '../helpers/address-server'
const PORT = 3000
describe('Address query utils', async () => {
  let server
  before((done) => {
    server = app.listen(PORT, done)
  })
  after(() => {
    server.close()
  })

  it('Should process address query endpoint correctly', async () => {
    const addresses = await queryL1Contracts(
      `http://localhost:${PORT}/valid-address-json`
    )
    const expectedResponse = {
      AddressManager: '0x0116686E2291dbd5e317F47faDBFb43B599786Ef',
      L1CrossDomainMessenger: '0x80F43505d8d1A739504eB4237Eb15b2e0048Da8d',
      L1StandardBridge: '0xded2cB506a7374B9645726565b1bD790E605B7b1',
      StateCommitmentChain: '0x2706A171ECb68E0038378D40Dd1d136361d0cB7d',
      CanonicalTransactionChain: '0x31A65C6d4EB07ad51E7afc890aC3b7bE84dF2Ead',
      BondManager: '0x993F00eb9C73e3E4eAe3d6Afb4Ba65A6b8B5E597',
      L1ERC721Bridge: '0xEfDC2a236Dba7a8f60726b49abC79Ee6b22Ed445',
    }
    expect(addresses).to.deep.equal(expectedResponse)
  })
  it('Should reject invalid endpoints', async () => {
    expect(
      queryL1Contracts(`http://localhost:${PORT}/invalid-addresses`)
    ).to.be.rejectedWith(Error)
  })
})
