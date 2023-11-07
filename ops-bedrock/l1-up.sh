#!/usr/bin/env bash
set -eu

L1_URL="http://localhost:9545"

CONTRACTS_BEDROCK=./packages/contracts-bedrock
NETWORK=devnetL1
L1_FAUCET="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
# Helper method that waits for a given URL to be up. Can't use
# cURL's built-in retry logic because connection reset errors
# are ignored unless you're using a very recent version of cURL
function wait_up {
  echo -n "Waiting for $1 to come up..."
  i=0
  until curl -s -f -o /dev/null "$1"
  do
    echo -n .
    sleep 0.25

    ((i=i+1))
    if [ "$i" -eq 200 ]; then
      echo " Timeout!" >&2
      exit 0
    fi
  done
  echo "Done!"
}

mkdir -p ./.devnet

if [ ! -f ./.devnet/rollup.json ]; then
    GENESIS_TIMESTAMP=$(date +%s | xargs printf "0x%x")
else
    GENESIS_TIMESTAMP=$(jq '.genesis.l2_time' < .devnet/rollup.json)
fi

# Regenerate the L1 genesis file if necessary. The existence of the genesis
# file is used to determine if we need to recreate the devnet's state folder.
if [ ! -f ./.devnet/genesis-l1.json ]; then
  echo "Regenerating L1 genesis."
  (
    cd $CONTRACTS_BEDROCK
    L2OO_STARTING_BLOCK_TIMESTAMP=$GENESIS_TIMESTAMP npx hardhat genesis-l1 \
        --outfile genesis-l1.json
    mv genesis-l1.json ../../.devnet/genesis-l1.json
  )
fi

# Bring up L1.
(
  cd ops-bedrock
  echo "Bringing up L1..."
  docker-compose up -d l1
  wait_up $L1_URL
)

echo "L1 ready."
