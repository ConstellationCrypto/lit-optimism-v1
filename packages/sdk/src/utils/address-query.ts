import axios from 'axios'
import { Dictionary } from 'lodash'

import { OEL1ContractsLike } from '../interfaces'

const mapping = {
  AddressManager: 'AddressManager',
  L1CrossDomainMessenger: 'Proxy__OVM_L1CrossDomainMessenger',
  L1StandardBridge: 'Proxy__OVM_L1StandardBridge',
  L1ERC721Bridge: 'Proxy__L1ERC721Bridge',
  StateCommitmentChain: 'StateCommitmentChain',
  CanonicalTransactionChain: 'CanonicalTransactionChain',
  BondManager: 'BondManager',
}

export const queryL1Contracts = async (
  addressEndpoint: string
): Promise<OEL1ContractsLike> => {
  let l1Addresses: Dictionary<string>
  try {
    const res = await axios.get(addressEndpoint)
    l1Addresses = res.data
  } catch (error) {
    console.log(error.toJSON())
    return
  }
  const addressDict = {} as OEL1ContractsLike
  for (const [key, value] of Object.entries(mapping)) {
    if (value in l1Addresses) {
      addressDict[key as keyof OEL1ContractsLike] = l1Addresses[value]
    } else {
      throw new Error(
        `Not a valid endpoint for an address query, missing field: ${value}`
      )
    }
  }
  return addressDict
}
