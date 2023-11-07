#!/bin/sh

# FIXME: Cannot use set -e since bash is not installed in Dockerfile
# set -e

RETRIES=${RETRIES:-1000}
VERBOSITY=${VERBOSITY:-6}

GETH_DATA_DIR=/db
GETH_CHAINDATA_DIR="$GETH_DATA_DIR/geth/chaindata"
GETH_KEYSTORE_DIR="$GETH_DATA_DIR/keystore"
GENESIS_FILE_PATH="/genesis.json"
# get the genesis file from the deployer

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

# wait for the dtl to be up, else geth will crash if it cannot connect
curl \
    --fail \
    --show-error \
    --silent \
    --output /dev/null \
    --retry-connrefused \
    --retry $RETRIES \
    --retry-delay 1 \
    $ROLLUP_CLIENT_HTTP

wait_up $ROLLUP_STATE_DUMP_PATH

curl \
    --fail \
    --show-error \
    --silent \
    --retry-connrefused \
    --retry-all-errors \
    --retry $RETRIES \
    --retry-delay 5 \
    $ROLLUP_STATE_DUMP_PATH \
    -o $GENESIS_FILE_PATH

# import the key that will be used to locally sign blocks
# this key does not have to be kept secret in order to be secure
# we use an insecure password ("pwd") to lock/unlock the password
echo "Importing private key"
echo $OVM_BLOCK_SIGNER_PRIVATE_KEY > key.prv
echo "pwd" > password
geth account import --datadir="$GETH_DATA_DIR" --password ./password ./key.prv

# initialize the geth node with the genesis file
echo "Initializing Geth node"
geth --verbosity="$VERBOSITY" "$@" init --datadir="$GETH_DATA_DIR" "$GENESIS_FILE_PATH"

# start the geth node
echo "Starting Geth node"
exec geth \
  --datadir="$GETH_DATA_DIR" \
  --verbosity="$VERBOSITY" \
  --password ./password \
  --allow-insecure-unlock \
  --unlock $OVM_BLOCK_SIGNER_ADDRESS \
  --mine \
  --miner.etherbase $OVM_BLOCK_SIGNER_ADDRESS \
  "$@"
