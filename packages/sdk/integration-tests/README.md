# SDK Integration Tests
Adding a set of integration tests for the sdk

## Running these
First, set the following env variables. The following is a reference for the cronos testnet chain.

    export L1_RPC_URL='https://testnet-archive.cronoslabs.com/v1/954898ea8a4a997e795f611909bf6336'
    export PRIVATE_KEY='0x8d00ac76e2ce464de6d2aae7c569b85dcc81cbd583fb7b7232a6c0ed483a7eb9'
    export ADDRESS_ENDPOINT='https://cro-test.calderachain.xyz/addresses.json'
    export GET_LOGS_ENDPOINT='http://localhost:4000/api/eth-rpc'
    export L2_RPC_URL='https://cro-test.calderachain.xyz/http'

Then from the sdk directory, run `npx hardhat test integration-tests/integration.spec.ts`.