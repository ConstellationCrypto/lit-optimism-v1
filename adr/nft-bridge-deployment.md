# NFT bridge deployment

## Context
Currently, NFT bridging is not deployed with Constellation. Although NFT bridge code and deployment exists in the repository, we want to modify the deployment process to deploy NFT bridging automatically and save the information necessary to use the NFT bridges.

## Proposed Changes
Adding a deploy script in `packages/contracts/deploy` which deploys an NFT bridge (based off the deployment code in `integration-tests`). This deploy script only deploys the L1 NFT bridge; the L2 NFT bridge + NFT token factory are deployed in `packages/contracts/tasks/take-dump.ts` as predeploys.

Integration tests were also added to ensure that deployment went smoothly and the NFT bridge functioned correctly both ways.

## Positives
This is a gud feature.

## Negatives
Our deployment process diverges somewhat from Optimism's. This shouldn't matter too much because we intend to ditch pre-bedrock eventually. In the meantime, this is a bit of cruft that adds overheard if we ever decide to rebase to the most recent pre-bedrock build.

## Miscellaneous Notes

