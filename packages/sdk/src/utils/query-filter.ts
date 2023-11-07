import { BaseContract, ethers, providers } from 'ethers'
import { resolveProperties, shallowCopy } from '@ethersproject/properties'
import {
  Filter,
  FilterByBlockHash,
  Log,
} from '@ethersproject/abstract-provider'

// Most logic taken from: https://github.com/ethers-io/ethers.js/blob/f97b92bbb1bde22fcc44100af78d7f31602863ab/packages/providers/src.ts/base-provider.ts#L1921
// Changes are to remove the call to getNetwork and to prepend 0x if the blockNumber lacks it
const getLogs = async (
  provider: ethers.providers.BaseProvider,
  filter: Filter | FilterByBlockHash | Promise<Filter | FilterByBlockHash>
): Promise<Array<Log>> => {
  const params = await resolveProperties({
    filter: provider._getFilter(filter),
  })
  const logs: Array<Log> = await provider.perform('getLogs', params)
  logs.forEach((log) => {
    // Hack because the blockscout ethrpc api returns blockNumber without the 0x prefix
    if (log.blockNumber.toString().slice(0, 2) !== '0x') {
      log.blockNumber = ethers.BigNumber.from('0x' + log.blockNumber).toNumber()
    }
    if (log.removed == null) {
      log.removed = false
    }
  })
  return providers.Formatter.arrayOf(
    provider.formatter.filterLog.bind(provider.formatter)
  )(logs)
}

/**
 * queryFilter copies the interface of of ethers.Contract.queryFilter and adds a getLogsProvider
 * that will be used in case the default provider attached to the contract experiences errors (ie.
 * when there exists a 10k block range limit on calls to eth_getLogs).
 */
const queryFilter = async (
  contract: BaseContract,
  event: ethers.EventFilter,
  fromBlockOrBlockhash?: ethers.providers.BlockTag | string,
  toBlock?: ethers.providers.BlockTag,
  getLogsProvider?: providers.Provider
): Promise<ethers.Event[] | any> => {
  let defaultProviderError
  let dedicatedProviderError = 'No dedicated provider provided'
  try {
    return await contract.queryFilter(event, fromBlockOrBlockhash, toBlock)
  } catch (e) {
    defaultProviderError = e
  }
  if (getLogsProvider) {
    try {
      // Need to access private properties of the contract to get the event object
      const runningEvent = (contract as any)._getRunningEvent(event)
      const filter = shallowCopy(runningEvent.filter)
      ;(filter as Filter).fromBlock =
        fromBlockOrBlockhash != null ? fromBlockOrBlockhash : 0
      ;(filter as Filter).toBlock = toBlock != null ? toBlock : 'latest'
      // The getLogsProvider can handle standard EVM jsonrpc getLog calls
      const logs = await getLogs(
        getLogsProvider as ethers.providers.BaseProvider,
        filter
      )
      // Parse logs and parse as Event objects (specific to each contract)
      const events = logs.map((log) => {
        return contract._wrapEvent(runningEvent, log, null)
      })
      return events
    } catch (e) {
      dedicatedProviderError = e
    }
  }
  throw new Error(
    `Both default and dedicated providers failed for eth_getLogs, here are the errors: \n
            Default Provider error: ${defaultProviderError}, \n
            Dedicated Provider error: ${dedicatedProviderError}\n`
  )
}

export default queryFilter
