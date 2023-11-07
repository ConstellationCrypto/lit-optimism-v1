import { ethers } from 'ethers'

import { AwsKmsSigner } from '../src'
import { expect } from './setup'

// In order to run these tests, you must be authenticated on the sandbox
// AWS account (or change the keyId to a valid key)

const keyId = 'mrk-27a1189981c94f6b8771df0c57759a1e'
const region = 'us-west-2'
describe('KMS', () => {
  let signer
  const provider = new ethers.providers.JsonRpcProvider(
    // 'https://eth-goerli.g.alchemy.com/v2/R-2IK-_U4uoJKpr3zO9VqUl3upMmZsPh'
    'http://localhost:8545'
  )
  before(() => {
    signer = new AwsKmsSigner({ region, keyId }, provider)
  })
  it.skip('Should print the address', async () => {
    expect(
      (await signer.getAddress()) ===
        '0x041449b070d13a2ef5b6483c8093f337ecd22f62'
    )
  })
  it.skip('should sign a transaction properly', async () => {
    const tx = await signer.sendTransaction({
      to: '0x041449b070d13a2ef5b6483c8093f337ecd22f62',
      value: '0x10',
    })
    await tx.wait()
    console.log('TX hash', tx.hash)
  }).timeout(40_000)
})
