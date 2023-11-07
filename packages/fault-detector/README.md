# @eth-optimism/fault-detector

The `fault-detector` is a simple service for detecting discrepancies between your local view of the Optimism network and the L2 output proposals published to Ethereum.

## Installation

Clone, install, and build the Optimism monorepo:

```
git clone https://github.com/ethereum-optimism/optimism.git
yarn install
yarn build
```

## Running the service

Copy `.env.example` into a new file named `.env`, then set the environment variables listed there.
Once your environment variables have been set, run the service via:

```
yarn start
```

## Halting the Bridge
If the env variable `FAULT_DETECTOR__PAUSE_BRIDGE_ON_FAULT` is set to true, the fault detector will pause the L1 Cross Domain messenger contract. This prevents any L2 => L1 messages from being finalized.

If the env variable `FAULT_DETECTOR__PAUSE_MODULE_ADDRESS` is provided, then the EOA provided in `FAULT_DETECTOR__CROSS_DOMAIN_MESSENGER_OWNER` needs to be one of the owners of the gnosis safe that owns the msssenger contract. The `PauseModule` contract allows any of the owners of the safe that owns the messenger contract to call the pause function on the bridge.

## Running integration tests
Initialize a Constellation L2, referencing the `ops-constellation` folder. In order to properly test the fault detector's ability to halt the bridge, the fault proof window should be set to at least 30 seconds. The integration tests assume a local deployment and will look for a file at `Constellation-Optimism/.constellation/secret` that contains a json of key names and private keys. If that file is lacking, you can also set the `secret` variable to a dict that's populated with the keys for `OVM_SEQUENCER`, `OVM_PROPOSER`, `DEPLOYER`. The sequencer and proposer need to be set to the appropriate keys in order to append fraudulent batches to the rollup smart contracts. The deployer key just needs to be set to some key that has funds on the L2.

To run the tests, `yarn run test:integration`.

The tests initiate a withdrawal then append a fraudulent batch. Then, the withdrawal is attempted to be finalized. If the fault detector is working properly, the fault detector should pause the bridge and prevent the finalization of the withdrawal.