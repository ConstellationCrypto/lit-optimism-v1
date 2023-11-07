import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandInput,
  GetSecretValueCommandOutput,
  CreateSecretCommand,
  CreateSecretCommandInput,
  CreateSecretCommandOutput,
  DeleteSecretCommand,
  DeleteSecretCommandInput,
  DeleteSecretCommandOutput,
  RemoveRegionsFromReplicationCommand,
  RemoveRegionsFromReplicationCommandInput,
  ReplicaRegionType,
} from '@aws-sdk/client-secrets-manager'
import { ethers } from 'ethers'

export const defaultReplicaRegions: ReplicaRegionType[] = [
  { Region: 'ap-southeast-1' },
  { Region: 'eu-central-1' },
]

export interface PerL1Secret {
  L1_FEE_WALLET_PRIVATE_KEY: string
}

export interface PerDeploymentSecret {
  DEPLOYER_PRIVATE_KEY: string
  GAS_PRICE_ORACLE_OWNER_PRIVATE_KEY: string
  OVM_SEQUENCER_PRIVATE_KEY: string
  OVM_PROPOSER_PRIVATE_KEY: string
  OVM_ADDRESS_MANAGER_OWNER_PRIVATE_KEY: string
}

export const INVALID_TYPE_SECRET_ID = new Error(
  'Invalid parameters for secretId type'
)
export const INVALID_CHAR_SECRET_ID = new Error(
  'Invalid characters in parameters for secretId'
)
export const INVALID_SECRET = new Error('Invalid secret')

/**
 * validate and generate secret Id for given parameters
 *
 * @param  {boolean} isProd is the secret for production or testing
 * @param  {string} l1Name  must contain only alphanumeric characters and the characters _+=.@
 * @param  {string} l1ChainId  must contain only 0-9
 * @param  {boolean} isPerL1 type of intended secret
 * @param  {string} l2Name can be customer's app name, must contain only alphanumeric characters and the characters _+=.@
 * @param  {string} l2ChainId  must contain only 0-9
 * @returns string secretId for AWS secrets manager
 */
export const generateSecretId = (
  isProd: boolean,
  l1Name: string,
  l1ChainId: string,
  isPerL1: boolean,
  l2Name?: string,
  l2ChainId?: string
): string => {
  // if isPerL1 is true, then l2Name, l2ChainId must be undefined
  // if isPerL1 is false, then l2Name, l2ChainId must NOT be undefined
  if (
    (isPerL1 && (l2Name || l2ChainId)) ||
    (!isPerL1 && (!l2Name || !l2ChainId))
  ) {
    throw INVALID_TYPE_SECRET_ID
  }

  const nameRegex = new RegExp('^[a-zA-Z0-9_+=.@]*$')
  const idRegex = new RegExp('^[0-9]*$')
  if (isPerL1) {
    if (nameRegex.test(l1Name) && idRegex.test(l1ChainId)) {
      return (
        (isProd ? 'prod' : 'test') +
        '/' +
        l1Name +
        '-' +
        l1ChainId +
        '/' +
        'perL1'
      )
    }
  } else {
    if (
      nameRegex.test(l1Name) &&
      idRegex.test(l1ChainId) &&
      nameRegex.test(l2Name) &&
      idRegex.test(l2ChainId)
    ) {
      return (
        (isProd ? 'prod' : 'test') +
        '/' +
        l1Name +
        '-' +
        l1ChainId +
        '/' +
        l2Name +
        '-' +
        l2ChainId +
        '/' +
        'perDeploy'
      )
    }
  }

  throw INVALID_CHAR_SECRET_ID
}

/************ secret functions ************/

/**
 * @param  {DeploymentSecret|InitialSecret} secret deployment secret
 * @returns boolean whether the deployment secret is comprised of valid private keys
 */
export const isValidSecret = (
  secret: PerDeploymentSecret | PerL1Secret
): boolean => {
  for (const privKey of Object.values(secret)) {
    try {
      new ethers.Wallet(privKey)
    } catch (err) {
      return false
    }
  }
  return true
}

/**
 * @param  {SecretsManagerClient} client aws client
 * @param  {string} secretId secret id on aws secrets manager
 * @param  {DeploymentSecret} secret secret to store
 * @param  {ReplicaRegionType[]} replicaRegions? optional secret replicas to add when creating a secret on aws secrets manager
 * @returns Promise client response
 */
export const storeSecret = async (
  client: SecretsManagerClient,
  secretId: string,
  secret: PerDeploymentSecret | PerL1Secret,
  replicaRegions?: ReplicaRegionType[]
): Promise<CreateSecretCommandOutput> => {
  if (!isValidSecret(secret)) {
    throw INVALID_SECRET
  }

  const input: CreateSecretCommandInput = {
    Name: secretId,
    SecretString: JSON.stringify(secret),
    AddReplicaRegions: replicaRegions,
  }
  const command = new CreateSecretCommand(input)
  return client.send(command)
}

/**
 * @param  {SecretsManagerClient} client aws client
 * @param  {string} secretId secret id on aws secrets manager, can use ARN as well
 * @returns Promise client response
 */
export const getSecret = async (
  client: SecretsManagerClient,
  secretId: string
): Promise<GetSecretValueCommandOutput> => {
  const input: GetSecretValueCommandInput = { SecretId: secretId }
  const command = new GetSecretValueCommand(input)
  return client.send(command)
}

/**
 * @param  {SecretsManagerClient} client aws client
 * @param  {string} secretId secret id on aws secrets manager
 * @param  {ReplicaRegionType[]} replicaRegions? optional secret replicas to delete when deleting a secret on aws secrets manager
 * @returns Promise client response
 */
export const deleteSecret = async (
  client: SecretsManagerClient,
  secretId: string,
  replicaRegions?: ReplicaRegionType[]
): Promise<DeleteSecretCommandOutput> => {
  // replicas always need to be removed before the secret
  if (replicaRegions) {
    const replicaInput: RemoveRegionsFromReplicationCommandInput = {
      SecretId: secretId,
      RemoveReplicaRegions: replicaRegions.map((region) => region.Region),
    }
    const replicaCommand = new RemoveRegionsFromReplicationCommand(replicaInput)
    await client.send(replicaCommand)
  }

  const input: DeleteSecretCommandInput = { SecretId: secretId }
  const command: DeleteSecretCommand = new DeleteSecretCommand(input)
  return client.send(command)
}
