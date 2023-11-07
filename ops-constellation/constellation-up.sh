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
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
    $L1_RPC_URL > /dev/null

export DOCKER_BUILDKIT=1

if [ ! -d $CONFIG_DIR/rollup-config ]; then
  mkdir -p $CONFIG_DIR/rollup-config/
  LOAD_ROLLUP_FROM_CONFIG="false"
  node util/rollup-setup.js --rpc $L1_RPC_URL --config_dir $CONFIG_DIR
else
  LOAD_ROLLUP_FROM_CONFIG="true"
fi

export L1_START_HEIGHT="$(cat $CONFIG_DIR/rollup-config/l1-startHeight)"

mkdir -p $CONFIG_DIR/keys/

node util/generate-accounts.js --rpc $L1_RPC_URL \
  --config_dir $CONFIG_DIR \
  --l1_fee_wallet_private_key $L1_FEE_WALLET_PRIVATE_KEY \
  --load_rollup_from_config $LOAD_ROLLUP_FROM_CONFIG \
  --kms $KMS

function load_priv {
  echo $(cat $CONFIG_DIR/keys/$1-priv.txt)
}
function load_addr {
  echo $(cat $CONFIG_DIR/keys/$1-addr.txt)
}

if [ "$KMS" = "true" ]; then
  export OVM_SEQUENCER_KMS_ID=$(load_priv OVM_SEQUENCER)
  export OVM_PROPOSER_KMS_ID=$(load_priv OVM_PROPOSER)
  export GAS_PRICE_ORACLE_KMS_ID=$(load_priv GAS_PRICE_ORACLE_OWNER)
  export OVM_ADDRESS_MANAGER_OWNER_KMS_ID=$(load_priv OVM_ADDRESS_MANAGER_OWNER)
else
  export OVM_SEQUENCER_PRIVATE_KEY=0x$(load_priv OVM_SEQUENCER)
  export OVM_PROPOSER_PRIVATE_KEY=0x$(load_priv OVM_PROPOSER)
  export GAS_PRICE_ORACLE_OWNER_PRIVATE_KEY=0x$(load_priv GAS_PRICE_ORACLE_OWNER)
  export OVM_ADDRESS_MANAGER_OWNER_PRIVATE_KEY=$(load_priv OVM_ADDRESS_MANAGER_OWNER)
fi

export DEPLOYER_PRIVATE_KEY=0x$(load_priv DEPLOYER)
export OVM_SEQUENCER_ADDRESS=$(load_addr OVM_SEQUENCER)
export OVM_PROPOSER_ADDRESS=$(load_addr OVM_PROPOSER)
export GAS_PRICE_ORACLE_OWNER=$(load_addr GAS_PRICE_ORACLE_OWNER)
export OVM_ADDRESS_MANAGER_OWNER=$(load_addr OVM_ADDRESS_MANAGER_OWNER)




if [ -z "$K8S" ]; then
  if [ -n "$CI" ]; then
    export L1_RPC_URL=http://host.docker.internal:9545
  fi
  if [ -n "$METRICS" ]; then
    docker-compose --env-file ./envs/empty.env -f docker-compose-constellation.yml -f docker-compose-metrics.yml up --build --detach
  else
    docker-compose --env-file ./envs/empty.env -f docker-compose-constellation.yml up --build --detach
  fi
else
  if [ -n "$EKS" ]; then
    kubectl apply -f ./k8s/config/efs
    while [[ $(kubectl get pvc efs-claim -o 'jsonpath={..status.phase}') != "Bound" ]]; do echo "waiting for PVC status" && sleep 1; done
  fi
  if [ -n "$CI" ]; then
    export L1_RPC_URL=http://host.minikube.internal:9545
    COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose-constellation.yml build
  fi
  bash util/generate-config-map.sh
  # TODO: have some way to inject image based on version or automatically set image
  # tag in k8s config
  kubectl apply -f ./k8s/config/init
  while [[ $(kubectl get pods init-pod -o 'jsonpath={..status.conditions[?(@.type=="Ready")].status}') != "True" ]]; do echo "waiting for init-pod to be ready" && sleep 1; done
  # Copy the contents of .constellation to the mounted constellation folder
  INIT_POD=$(kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep init-pod)
  kubectl cp $CONFIG_DIR $INIT_POD:/tmp/constellation
  kubectl exec $INIT_POD -- sh -c 'rm -rf /constellation/* && cp -r /tmp/constellation/* /constellation'
  kubectl delete pod $INIT_POD

  kubectl apply -f ./k8s/config/deployer,./k8s/config/gas-oracle
  kubectl apply -f ./k8s/config/l2geth
  kubectl apply -f ./k8s/config/dtl,./k8s/config/batch-submitter,./k8s/config/proxyd
  kubectl apply -f ./k8s/config/verifier,./k8s/config/replica
  if [ -n "$EKS" ]; then
    kubectl apply -f ./k8s/config/ingress.yml
  fi
fi


