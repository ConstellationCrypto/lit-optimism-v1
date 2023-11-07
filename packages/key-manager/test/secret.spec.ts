import {
  ReplicaRegionType,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'
import { replace, fake } from 'sinon'

import {
  PerDeploymentSecret,
  PerL1Secret,
  storeSecret,
  getSecret,
  deleteSecret,
  generateSecretId,
  INVALID_TYPE_SECRET_ID,
  INVALID_CHAR_SECRET_ID,
} from '../src'
import { expect } from './setup'

describe('secretId', () => {
  it('should return secretId given valid parameters', () => {
    expect(
      generateSecretId(
        true,
        'celestia_+=.@',
        '1234567890',
        false,
        'valve_+=.@',
        '420'
      )
    ).to.equal('prod/celestia_+=.@-1234567890/valve_+=.@-420/perDeploy')

    expect(
      generateSecretId(
        false,
        'celestia_+=.@',
        '1234567890',
        false,
        'valve_+=.@',
        '420'
      )
    ).to.equal('test/celestia_+=.@-1234567890/valve_+=.@-420/perDeploy')

    expect(
      generateSecretId(true, 'ethereum_+=.@', '1234567890', true)
    ).to.equal('prod/ethereum_+=.@-1234567890/perL1')

    expect(
      generateSecretId(false, 'ethereum_+=.@', '1234567890', true)
    ).to.equal('test/ethereum_+=.@-1234567890/perL1')
  })

  it('should not throw error given valid parameters', () => {
    expect(() => {
      generateSecretId(
        false,
        'ethereum_+=.@',
        '1234567890',
        false,
        'darkForest_+=.@',
        '420'
      )
    }).to.not.throw()

    expect(() => {
      generateSecretId(false, 'ethereum_+=.@', '1234567890', true)
    }).to.not.throw()
  })

  it('should throw error given invalid parameters', () => {
    expect(() => {
      generateSecretId(
        false,
        'ethereum_+=.@',
        '1234567890',
        true,
        'darkForest_+=.@',
        '420'
      )
    }).to.throw(INVALID_TYPE_SECRET_ID)

    expect(() => {
      generateSecretId(false, 'ethereum_+=.@', '1234567890', false)
    }).to.throw(INVALID_TYPE_SECRET_ID)

    expect(() => {
      generateSecretId(
        true,
        'evmos',
        '123456789+0', // '+' is illegal
        true
      )
    }).to.throw(INVALID_CHAR_SECRET_ID)

    expect(() => {
      generateSecretId(
        true,
        'celo-', // '-' is illegal
        '1234567890',
        true
      )
    }).to.throw(INVALID_CHAR_SECRET_ID)

    expect(() => {
      generateSecretId(
        true,
        'celo',
        '1234567890',
        false,
        'dark-Forest_+=.@', // '-' is illegal
        '420'
      )
    }).to.throw(INVALID_CHAR_SECRET_ID)

    expect(() => {
      generateSecretId(
        true,
        'celo',
        '1234567890',
        false,
        'dark-Forest_+=.@',
        '42/0' // '/' is illegal
      )
    }).to.throw(INVALID_CHAR_SECRET_ID)
  })
})

describe('secret', () => {
  let secret: PerDeploymentSecret
  let invalidSecret: PerL1Secret
  let secretId: string
  let client: SecretsManagerClient

  before(() => {
    secretId = 'test/constellation/unit-tests'
    secret = {
      DEPLOYER_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      GAS_PRICE_ORACLE_OWNER_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      OVM_SEQUENCER_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      OVM_PROPOSER_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      OVM_ADDRESS_MANAGER_OWNER_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    }
    invalidSecret = {
      L1_FEE_WALLET_PRIVATE_KEY: 'looksrare',
    }
  })

  beforeEach(() => {
    client = new SecretsManagerClient({})
  })

  describe('storeSecret', () => {
    describe('when secret is invalid', () => {
      it('throw an error', async () => {
        const fakeSend = fake()
        replace(client, 'send', fakeSend)
        await storeSecret(client, secretId, invalidSecret).should.be.rejected
      })
    })

    describe('when send a command', () => {
      it('should have *input* parameters set correctly', async () => {
        const fakeSend = fake()
        replace(client, 'send', fakeSend)
        await storeSecret(client, secretId, secret)
        expect(fakeSend.calledOnce).to.be.true
        expect(fakeSend.getCall(0).args[0].input.SecretString).to.equal(
          JSON.stringify(secret)
        )
        expect(fakeSend.getCall(0).args[0].input.Name).to.equal(secretId)
      })
    })

    describe('when successfully getting a response', () => {
      it('should have response, and not throw an error', async () => {
        const fakeSend = fake(() => {
          return { Name: secretId }
        })
        replace(client, 'send', fakeSend)
        const res = await storeSecret(client, secretId, secret)
        expect(fakeSend.calledOnce).to.be.true
        expect(res.Name).to.equal(secretId)
      })
    })

    describe('when failed to get a response', () => {
      it('should throw an error', async () => {
        const error = new Error('no secret')
        const fakeSend = fake.throws(error)
        replace(client, 'send', fakeSend)
        await storeSecret(client, secretId, secret).should.be.rejectedWith(
          error
        )
      })
    })
  })

  describe('getSecret', () => {
    describe('when send a command', () => {
      it('should have *input* parameters set correctly', async () => {
        const fakeSend = fake()
        replace(client, 'send', fakeSend)
        await getSecret(client, secretId)
        expect(fakeSend.calledOnce).to.be.true
        expect(fakeSend.getCall(0).args[0].input.SecretId).to.equal(secretId)
      })
    })

    describe('when successfully getting a response', () => {
      it('should have response, and not throw an error', async () => {
        const fakeSend = fake(() => {
          return { Name: secretId }
        })
        replace(client, 'send', fakeSend)
        const res = await getSecret(client, secretId)
        expect(fakeSend.calledOnce).to.be.true
        expect(res.Name).to.equal(secretId)
      })
    })

    describe('when failed to get a response', () => {
      it('should throw an error', async () => {
        const error = new Error('no secret')
        const fakeSend = fake.throws(error)
        replace(client, 'send', fakeSend)
        await storeSecret(client, secretId, secret).should.be.rejectedWith(
          error
        )
      })
    })
  })

  describe('deleteSecret', () => {
    let replicaRegions: ReplicaRegionType[]

    before(() => {
      replicaRegions = [
        { Region: 'ap-southeast-1' },
        { Region: 'eu-central-1' },
      ]
    })

    describe('when send a command without replicaRegions', () => {
      it('should have *input* parameters set correctly', async () => {
        const fakeSend = fake()
        replace(client, 'send', fakeSend)
        await deleteSecret(client, secretId)
        expect(fakeSend.calledOnce).to.be.true
        expect(fakeSend.getCall(0).args[0].input.SecretId).to.equal(secretId)
      })
    })

    describe('when send a command with replicaRegions', () => {
      it('should have *input* parameters set correctly', async () => {
        const fakeSend = fake()
        replace(client, 'send', fakeSend)
        await deleteSecret(client, secretId, replicaRegions)
        expect(fakeSend.calledTwice).to.be.true
        expect(fakeSend.getCall(0).args[0].input.SecretId).to.equal(secretId)
        expect(
          fakeSend.getCall(0).args[0].input.RemoveReplicaRegions
        ).to.deep.equal(replicaRegions.map((region) => region.Region))
        expect(fakeSend.getCall(1).args[0].input.SecretId).to.equal(secretId)
      })
    })

    describe('when successfully getting a response', () => {
      it('should have response, and not throw an error', async () => {
        const fakeSend = fake(() => {
          return { Name: secretId }
        })
        replace(client, 'send', fakeSend)
        const res = await deleteSecret(client, secretId)
        expect(fakeSend.calledOnce).to.be.true
        expect(res.Name).to.equal(secretId)
      })
    })

    describe('when failed to get a response', () => {
      it('should throw an error', async () => {
        const error = new Error('no secret')
        const fakeSend = fake.throws(error)
        replace(client, 'send', fakeSend)
        await storeSecret(client, secretId, secret).should.be.rejectedWith(
          error
        )
      })
    })
  })
})
