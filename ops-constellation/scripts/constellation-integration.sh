#!/bin/bash
set -e

# Fill in the following values if you want to use this script for testing
export PRIVATE_KEY=
export L2_CHAINID=
export GAS_PRICE_ORACLE_PRIVATE_KEY=
# export GAS_PRICE_ORACLE_KMS_ID="8c720f8e-417a-4536-8af9-0cf4549cf7ff"
# export REGION="us-west-2"


export L1_URL=http://localhost:9545
export L2_URL=http://localhost:8545
export URL=http://localhost:8080/addresses.json
export ENABLE_GAS_REPORT=1
export NO_NETWORK=1
export BATCH_SUBMITTER_SEQUENCER_BATCH_TYPE=${BATCH_SUBMITTER_SEQUENCER_BATCH_TYPE:-zlib}

export RUN_SYSTEM_ADDRESS_TESTS='false'
export RUN_HEALTHCHECK_TESTS='false'
export TEST_FPE='true'

# must match l2geth environment, see above for why it's safe to publish these
export SYSTEM_ADDRESS_0_DEPLOYER_KEY='a6aecc98b63bafb0de3b29ae9964b14acb4086057808be29f90150214ebd4a0f'
export SYSTEM_ADDRESS_1_DEPLOYER_KEY='3b8d2345102cce2443acb240db6e87c8edd4bb3f821b17fab8ea2c9da08ea132'

RETRIES=${RETRIES:-60}
JSON='{"jsonrpc":"2.0","id":0,"method":"rollup_getInfo","params":[]}'

if [[ ! -z "$URL" ]]; then
    # get the addrs from the URL provided
    ADDRESSES=$(curl --fail --show-error --silent --retry-connrefused --retry $RETRIES --retry-delay 5 $URL)
    export ADDRESS_MANAGER=$(echo $ADDRESSES | jq -r '.AddressManager')
    export L1_CROSS_DOMAIN_MESSENGER=$(echo $ADDRESSES | jq -r '.Proxy__OVM_L1CrossDomainMessenger')
    export L1_STANDARD_BRIDGE=$(echo $ADDRESSES | jq -r '.Proxy__OVM_L1StandardBridge')
    export STATE_COMMITMENT_CHAIN=$(echo $ADDRESSES | jq -r '.StateCommitmentChain')
    export CANONICAL_TRANSACTION_CHAIN=$(echo $ADDRESSES | jq -r '.CanonicalTransactionChain')
    export BOND_MANAGER=$(echo $ADDRESSES | jq -r '.BondManager')
    export L1ERC721Bridge=$(echo $ADDRESSES | jq -r '.Proxy__L1ERC721Bridge')
    export L1_FPE=$(echo $ADDRESSES | jq -r '.L1_FPE')
fi

# wait for the sequencer to be up
curl \
    --silent \
    --fail \
    --show-error \
    -H "Content-Type: application/json" \
    --retry-connrefused \
    --retry $RETRIES \
    --retry-delay 3 \
    -d $JSON \
    --output /dev/null \
    $L2_URL

cd ./../../integration-tests
NODE_OPTIONS="--max_old_space_size=16384" HARDHAT_MAX_MEMORY=16384 npx hardhat test --network optimism --no-compile "$@" --grep "CONSTELLATION"
