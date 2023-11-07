# Forking and Key Management
## Changelog
Contributors: Parker Jou
June 23rd, 2022 - first version
June 26th, 2022 - update for sdk

## Context
We have decided to revert to a pre-bedrock build of Optimism (commit: 06d821ba771a1cdbff79bd3d980b8c09ad33afee). As such, we need to maange our own keys and be able to deploy Optimism forks onto the L1 of our choice.

## Proposed Changes

The following keys need to be accounted for and handled appropriately:
Gas price oracle (prefunded on the L2)
- Address set in deployment env variable
- private key set in gas oracle config

Batch submitter Proposer
- account that submits state roots on the L1 (fund on L1)
- OVM_PROPOSER_ADDRESS

Batch submitter sequencer
- submits transactions to CTC, so the actual compressed transactions (fund on L1)
- OVM_SEQUENCER_ADDRESS

Contract Deployer Key
- Contract deployer key (fund on L1)

L1 Fee wallet address
- address of the fee wallet (where you withdraw fees)

SYSTEM_ADDRESS_0_DEPLOYER
SYSTEM_ADDRESS_1_DEPLOYER
- Only used in integration tests

In order to add support for an L1 with a new chainId:
In Constellation-Optimism/packages/sdk/src/utils/contracts.ts, make sure that CONTRACT_ADDRESSES in addresses.json is populated for the chain ID of the L1, and that BRIDGE_ADAPTER_DATA is likewise.

See ops/README.md for details on how to launch Optimism forks.

In the deploy process, we now create a folder `.constellation` at the root directory, where we will store config files config.json for contract deployment (`.constellation/config.json` is loaded in `packages/deploy-config/constellation.ts`). In preparation for making the deployer resist to outage, we will also be relocating the dump folder to `.constellation` and making `.constellation` a volume.

In addition, in `ops/integration-test.sh`, addresses of contracts are now queried from the deployer endpoint.



## Positives
We need to manage our own keys (or at least use non-public accounts). Many parts of this change are necessary to release Optimism in production.

## Negatives
The way new L1 chainIds are added is poorly designed. Integration tests will work on the first deployment of Optimism smart contracts because the in /packages/sdk/src/utils/contracts.ts are set to the addresses if we are using an account of nonce 0. I favor querying the deployer's address.json endpoint in a future PR.


## Miscellaneous notes
