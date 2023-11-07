#!/bin/bash
set -e

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
    if [ "$TEST_FPE" == "true" ]; then
        export L1_FPE=$(echo $ADDRESSES | jq -r '.L1_FPE')
    fi
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

NODE_OPTIONS="--max_old_space_size=16384" HARDHAT_MAX_MEMORY=16384 npx hardhat test --network optimism --no-compile "$@"
