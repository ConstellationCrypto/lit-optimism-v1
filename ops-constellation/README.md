# docker-compose

The docker-compose project runs a local optimism stack.


## Starting and stopping the project
### Building the project

First, install dependencies:
  go, gcc, make, docker + docker-compose, node v16 (lts), forge, jq

Run `make build` from the `ops-constellation` folder to build node packages and docker images.

### Bringing up an L1
There are a couple options for preset L1s that work well out of the box. Start up a local hardhat node with
`npx hardhat node --port 9545 --hostname 0.0.0.0` from the ops-constellation directory or a local geth node with
`make geth-l1` from the root directory. These L1s prefund the default accounts used in deployments.

### Configuring env variables
By default, variables are loaded and parsed from `envs/default.env`. In addition, a `.env` file will need to be created under `ops-constellation` and the following variables need to be set:

- L1_FEE_WALLET_PRIVATE_KEY: must be a prefunded account on the L1. The default parameters require you have enough funds.
- L1_RPC_URL: the RPC_URL of the L1. This must be an external ip address as localhost is not accessible to
  docker-compose.

Some variables are labeled as "can be set" in `envs/default.env` and these variables can be set in the `.env` file. Any variables that are generated will be overriden in `ops-constellation/constellation-up.sh` if set in the `.env` file.


### Running using Docker-compose

Make sure the node & docker daemon is running, then run `make up` to bring up the Optimism fork. Monitor the
integration_tests docker process to ensure that the newly brought up Optimism fork is working.

*Note*: Deployments generates a large amount of log data which docker stores by default. See [Disk Usage](#disk-usage).

### Running using Kubernetes
Instead of using docker-compose, you can run using a local Kubernetes cluster instead.

#### Additional Configuration
If you're launching on a Kubernetes cluster, you will need to copy over k8s config files from one of the template folders found under `ops-constellation/k8s` as `k8s/config`, ie. `cp -r k8s/CI-template/ k8s/config`. From here, toggle any env variable within the config folder to fit specification

#### Launching
First run the following to set up a local cluster:

```bash
# install minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
minikube version # minikube should be installed

# Set up local minikube cluster.
cp example_envs/.example.env .env
cd ops-constellation
# in .env, set L1_RPC_URL=http://localhost:9545
minikube start --memory 16384 --cpus 4
# Set up web dashboard.
minikube dashboard
```


Then deploy the containers:

```bash
# Build containers
cd ops-constellation
eval $(minikube docker-env)
K8S=true CI=true ./constellation-up.sh
```

Check the web dashboard to ensure the pods have started successfully, and you should be good to go!

To run integration tests, run:

```bash
./scripts/wait-for-sequencer-k8s.sh
./constellation-integration-tests-k8s.sh
```

If the above command fails with an OOM error, you can:
- Go to the kubernetes dashboard in your browser
- Exec into the integration-tests pod
- Run: `RUN_VERIFIER_TESTS=false ./integration-tests.sh`.

If you ever want to re-deploy a single file, just run `kubectl apply [path to yaml file]`. If you need to re-create a Deployment, you can get its name and then stop it using `kubectl get deploy` and `kubectl delete deploy [deployname]`, then run `kubectl apply` to re-create the Deployment.

To stop the cluster, run:

```bash
K8S=true ./constellation-down.sh
```

If you want to delete everything that was created, run:

```bash
kubectl delete deployments --all && kubectl delete pvc --all && kubectl delete pv --all
```

#### Teardown

You can remove the minikube cluster by running:

```
minikube delete
```


## Disk Usage

The logs generated are in the gigabytes per day range, so you need to be wary of disk exhaustion when running for
long periods.

One way to solve this is to configure `/etc/docker/daemon.json` like this:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

This configures log rotation with a limit of 10MB per file and storing a maximum of three files (per container).
[More details on docker logging configuration](https://docs.docker.com/config/containers/logging/configure/).

You can also decrease logging by increasing polling intervals:

```env
DATA_TRANSPORT_LAYER__POLLING_INTERVAL=100
```

- [./envs/dtl.env#L7](./envs/dtl.env#L7)

```env
ROLLUP_POLL_INTERVAL_FLAG=500ms
```

- [./envs/geth.env#L8](./envs/geth.env#L8)
