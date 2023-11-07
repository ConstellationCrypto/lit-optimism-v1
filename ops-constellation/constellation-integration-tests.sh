set -a
. ./envs/default.env
. .env
set +a
set -e

# Do not change; hidden dependencies here; not ideal
export CONFIG_DIR="$(pwd)/../.constellation"

# TODO: currently manually set it in .env
# should retrieve L1_FEE_WALLET_PRIVATE_KEY from cloud
if [ -z "$L1_RPC_URL" ]; then echo "L1_RPC_URL MUST BE SET IN THE ENV"; exit; fi
if [ -z "$L1_FEE_WALLET_PRIVATE_KEY" ]; then echo "L1_FEE_WALLET_PRIVATE_KEY MUST BE SET IN THE ENV"; exit; fi
curl \
    --fail \
    --show-error \
    --silent \
    -H "Content-Type: application/json" \
    --retry-connrefused \
    --retry 100 \
    --retry-delay 1 \
    -d '{"jsonrpc":"2.0","id":0,"method":"net_version","params":[]}' \
    $L1_RPC_URL > /dev/null
export DOCKER_BUILDKIT=1

export L1_START_HEIGHT="$(cat $CONFIG_DIR/rollup-config/l1-startHeight)"

function load_priv {
  echo $(cat $CONFIG_DIR/keys/$1-priv.txt)
}
function load_addr {
  echo $(cat $CONFIG_DIR/keys/$1-addr.txt)
}

export DEPLOYER_PRIVATE_KEY=0x$(load_priv DEPLOYER)
export OVM_SEQUENCER_ADDRESS=$(load_addr OVM_SEQUENCER)
export OVM_SEQUENCER_PRIVATE_KEY=0x$(load_priv OVM_SEQUENCER)
export OVM_PROPOSER_ADDRESS=$(load_addr OVM_PROPOSER)
export OVM_PROPOSER_PRIVATE_KEY=0x$(load_priv OVM_PROPOSER)
export GAS_PRICE_ORACLE_OWNER=$(load_addr GAS_PRICE_ORACLE_OWNER)
export GAS_PRICE_ORACLE_OWNER_PRIVATE_KEY=0x$(load_priv GAS_PRICE_ORACLE_OWNER)
export OVM_ADDRESS_MANAGER_OWNER=$(load_addr OVM_ADDRESS_MANAGER_OWNER)
export OVM_ADDRESS_MANAGER_OWNER_PRIVATE_KEY=$(load_priv OVM_ADDRESS_MANAGER_OWNER)


if [ -n "$CI" ]; then
    export L1_RPC_URL=http://host.docker.internal:9545
fi
docker-compose --env-file ./envs/empty.env -f docker-compose-constellation.yml run integration_tests



