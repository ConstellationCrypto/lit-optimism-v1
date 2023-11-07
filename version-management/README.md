# Package and Version Management
## Publishing versioned packages
This folder contains a utility script to publish docker images to aws elastic container registry (ecr) and publicly exposed npm packages to the npm registry. To publish these packages + docker images, first decide what version you want to publish them under. The version number will be the same across all packages + image tags for the sake of consistency.

To publish: 

Login to an account with write access to the @constellation-labs npm registry via `npm adduser`. Configure the AWS cli to be authenticated for an IAM user under the AWS account id: 611878847432, belonging to admin@constellationlabs.xyz.

Set the env variable $VERSION to some valid version according to the semantic versioning system ([semantic versioning guide](https://semver.org/)).

Run `VERSION=$VERSION_NUMBER make publish`. This tool will strictly publish what version number is entered and no checks will be made as to validity or whether the version number makes semantic sense, so the user should exercise caution when determining version number.

I.e. `VERSION=1.0.0 make publish`

## What is being published
We use lerna to handle version management for packages and the npm registry for publication. We handle version control uniformly across the repo by setting lerna to fixed mode. Then we only publish the public-facing packages to the npm registry: @constellation-labs/sdk and @constellation-labs/contracts. These packages have dependencies on @constellation-labs/hardhat-deploy-config and @constellation-labs/core-utils so these dependencies are also published publicly. Other packages are kept private and remain unchanged from the original naming under the @eth-optimism organization.

These docker images are published to a private registry (aws ecr): deployer, l2geth, integration-tests, gas-oracle, batch-submitter-service. These are all tagged with the same version number as each other and as the node packages.

## Adding a new docker image to ECR
We're using terraform to manage aws ECR repositories.

To set up, run:

```
terraform init
```

To apply changes, run:

```
terraform apply
```

And check in the terraform state file to git.