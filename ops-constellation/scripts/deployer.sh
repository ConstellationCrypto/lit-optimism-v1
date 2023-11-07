#!/bin/bash
set -eo

RETRIES=${RETRIES:-20}
JSON='{"jsonrpc":"2.0","id":0,"method":"net_version","params":[]}'

if [ -z "$CONTRACTS_RPC_URL" ]; then
    echo "Must specify \$CONTRACTS_RPC_URL."
    exit 1
fi

# wait for the base layer to be up
curl \
    --fail \
    --show-error \
    --silent \
    -H "Content-Type: application/json" \
    --retry-connrefused \
    --retry $RETRIES \
    --retry-delay 1 \
    -d $JSON \
    $CONTRACTS_RPC_URL > /dev/null

echo "Connected to L1."
echo "Building deployment command."

DEPLOY_CMD="NODE_OPTIONS='--max-old-space-size=8192' npx hardhat deploy --network $CONTRACTS_TARGET_NETWORK"
if [ ! -d "/opt/optimism/.constellation" ]; then
    mkdir -p "/opt/optimism/.constellation"
fi

# S3_FOLDER should be the path of the .constellation folder in S3
if [ -n "$S3_FOLDER" ]; then
    # note that aws s3 ls searches by prefix (which emulates the concept of a folder our case)
    if [ -z "$(aws s3 ls $S3_FOLDER)" ]; then
        echo "Could not find S3_FOLDER: $S3_FOLDER, deploying from scratch"
    else
        echo "Copying .constellation from S3"
        aws s3 cp $S3_FOLDER /opt/optimism/.constellation --recursive
    fi
fi

if [ ! -d "/opt/optimism/.constellation/genesis" ]; then
    echo "Deploying contracts. Deployment command:"
    echo "$DEPLOY_CMD"
    eval "$DEPLOY_CMD" 

    echo "Building addresses.json."
    export ADDRESS_MANAGER_ADDRESS=$(cat "./deployments/$CONTRACTS_TARGET_NETWORK/Lib_AddressManager.json" | jq -r .address)
    # First, create two files. One of them contains a list of addresses, the other contains a list of contract names.
    find "./deployments/$CONTRACTS_TARGET_NETWORK" -maxdepth 1 -name '*.json' | xargs cat | jq -r '.address' > addresses.txt
    find "./deployments/$CONTRACTS_TARGET_NETWORK" -maxdepth 1 -name '*.json' | sed -e "s/.\/deployments\/$CONTRACTS_TARGET_NETWORK\///g" | sed -e 's/.json//g' > filenames.txt
    # Start building addresses.json.
    echo "{" >> addresses.json
    # Zip the two files describe above together, then, switch their order and format as JSON.
    paste addresses.txt filenames.txt | sed -e "s/^\([^ ]\+\)\s\+\([^ ]\+\)/\"\2\": \"\1\",/" >> addresses.json
    # Add the address manager alias.
    echo "\"AddressManager\": \"$ADDRESS_MANAGER_ADDRESS\"" >> addresses.json
    # End addresses.json
    echo "}" >> addresses.json
    echo "Built addresses.json. Content:"
    jq . addresses.json

    echo "Building dump file."
    npx hardhat take-dump --network $CONTRACTS_TARGET_NETWORK
    cp -r ./genesis /opt/optimism/.constellation/
    mv addresses.json /opt/optimism/.constellation/genesis/
    cp ./genesis/$CONTRACTS_TARGET_NETWORK.json /opt/optimism/.constellation/genesis/state-dump.latest.json
fi

if [ -n "$S3_FOLDER" ] && [ -z "$(aws s3 ls $S3_FOLDER)" ]; then
    echo "Uploading .constellation to S3"
    aws s3 cp /opt/optimism/.constellation $S3_FOLDER --recursive
fi

# service the addresses and dumps
echo "Starting server."
python3 -m http.server \
    --bind "0.0.0.0" 8081 \
    --directory /opt/optimism/.constellation/genesis
