# `@constellation-labs/key-manager`
## KMS Signer
Implementation taken from: https://github.com/rjchow/ethers-aws-kms-signer. Reimplemented for security reasons.

## Design

<iframe width="768" height="432" src="https://miro.com/app/live-embed/uXjVPaXX9ec=/?moveToViewport=-1795,-899,1961,1334&embedId=850815153903" frameborder="0" scrolling="no" allowfullscreen></iframe>

## Usage

``` typescript
import { storeSecret } from '@constellation-labs/key-manager'
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

const client: SecretsManagerClient = new SecretsManagerClient({})
const secretId = "define-your-secretId"
const secret = {
  L1_FEE_WALLET_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  FAUCET_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
}

const func = async () => {
  console.log(await storeSecret(client, secretId, secret))
}

func()

```
