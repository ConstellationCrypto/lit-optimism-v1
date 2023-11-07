#!/bin/bash

if [ -z "$VERSION" ]; then echo "VERSION MUST BE SET IN THE ENV"; exit; fi

# yarn lerna bootstrap
# yarn build
# yarn lerna publish $VERSION --force-publish


(
    cd $(pwd)/../ops-constellation
    make build
)

# publish docker images
export AWS_ACCOUNT_ID=716662532931
export REGION=us-west-2
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
for value in deployer l2geth integration-tests gas-oracle batch-submitter-service data-transport-layer proxyd balance-maintainer fault-detector
do
    docker tag ethereumoptimism/$value:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$value:$VERSION
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$value:$VERSION
    # docker tag ethereumoptimism/$value:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$value:latest
    # docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$value:latest
done
