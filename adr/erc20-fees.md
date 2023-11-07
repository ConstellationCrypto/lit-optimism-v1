# ERC20 Fees
## Changelog
July 4th, 2022 - Initial version
July 28th, 2022 - Implementation Complete
## Context
One feature that we want to offer customers is the ability to pay fees in their own ERC20 fee-paying token. The primary benefit envisioned for customers is that doing so adds utility to their token.

## Proposed Changes
Definition: FPE - Fee-paying ERC20

### Smart Contracts
L1 ERC20 token deployment:
    Deploy the L1 ERC20 token with configurable parameters
        name, ticker, max_supply

FPE token predeploy:
    Deployed as an L2StanfordERC20 pointing to the L1 ERC20
    Predeploy which is set to some address: 0x42FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    In order to do predeploys, we modify `packages/src/take-dump.ts` and insert the contract in the genesis block and the initial parameters into the appropriate slots in memory.

We save the ERC20 deployment configs in `.constellation/token-config.json`

FPEGasPriceOracle.sol is a gas price oracle that does the following:
    Stores whether a given account chooses to pay fees in FPE or native token (to be constellation L1 token)
    Serves the a number of pieces of information fetched from the L1 including price ratio of FPE to native token, L1 scalar (a constant factor premium charged for L1 block space), and L1 gas price.
    Also acts as the coinbase of fees paid in FPE from which the fee wallet can withdraw fees.

### L2geth

The bulk of logic lies in `l2geth/core/state_transition.go` and `l2geth/internal/ethapi/api.go`, with changes to other files being mostly accounting and configuration.

`l2geth/core/state/statedb.go` mostly contains utility functions to present an interface to modify the statedb. Specifically, functions to handle accounting for the state DB of geth: GetFPEBalance, GetFeeTokenSelection (fetches from the Gas price oracle what token a user is paying fees in), GetFPEPriceRatio, AddFPEBalance, SubFPEBalance. Then for testing: SetFPEAsFeeToken (setes the paying token for an account), SetFPEPriceRatio (sets the price ratio by hand).

`l2geth/core/state_processor.go` fetches the amount of gas used after applying the message, then populates the receipt with how much that transaction cost in erc20.

`l2geth/core/vm/interface.go` simply modifies the interface of the evm with functions implemented in `l2geth/core/state/statedb.go`.

In `l2geth/rollup/fees/rollup_fee.go`, we add a couple utility functions for computing L1 security fees for a given transaction.

In `l2geth/core/state_transition.go`, we implement the core logic for gas calculations and fee paying in ERC20.

If the user pays fees in native token, there is no change to logic. If the user pays fees in FPE:

NewStateTransition: Here, we use a helper function to calculate the L1 security fee of the raw transaction. Note that this cost is determined by the number of bytes on the L1 the transaction will consume multiplied by some constant scalar. We set the gasPrice to 0 in order to ensure that no native token is paid for the transaction. However, msg.GasPrice() still returns the original gas price so we can still access the original gas price (and block explorers should still index the correct gas price). We also grab the ratio of the price of FPE over native token from the FPEGasPriceOracle.

buyGas: Here, we buy the amount of gas according to msg.GasPrice(). Subtracts the appropriate amount of FPE balance and adds the amount of gas to st.gas (the purchased gas available for use). mgval is 0 because st.gasPrice = 0 in which case you the total fee deducted is msg.GasPrice() * msg.Gas(). If the transaction comes from the L1 (in case of deposits), you avoid adding the L1 security fee because the user has already paid. The user is then credited with the amount of gas they requested.

TransitionDb() handles the logic for doing a transaction gas-wise and gas is consumed by the L2 transaction as normal. After this, the user is refunded however much gas is left (initialGas - gasUsed) then the FPE gas price oracle is credited with the l1 security fee + gasUsed * gasPrice.


In `l2geth/rollup/sync_service.go`: verifyFee ensures that the native balance is high enough to handle the fee + value of the transaction. If fee is paid in ERC20, we estimate gas with validateGasLimit and ensure that the balance is great enough for the gas fee.

validateGasLimit ensures that the amount of gas attached to the transaction is greater than intrinsic gas (baseline cost for a transaction before execution) + the security fee (calculated via calculatel1gasfromGPO). This just does the basic checks to ensure the amount of gas is reasonable without actually running the transaction.

In `l2geth/internal/ethapi/api.go`, update the api endpoint to parse the L2 FPE fee field from the receipt.

We also ran go generate in order to generate marshalling methods for the receipt type. The generated output file should be at: `l2geth/core/types/gen_receipt_json.go`.


### Indexing services
TODO: FPE Gas price oracle service that continually updates the price ratio of FPE to native token.

## Positives and Negatives
This is a great feature to provide to developers because it should give the token a lot more utility and provide a natural sink. That said, this change makes modifications to the geth codebase which was already highly complex. It touches a relatively large surface area of core files and directly involves changing logic for charging fees + modifying account balances meaning this code touches much of the economic value flowing through a blockchain. Although this change is relatively thoroughly tested via both unit and integration tests, it nevertheless presents some security risk. In addition, by deviating from Optimism's geth with changes to core logic, we also reduce our ability to easily merge in upstream changes. This is somewhat mitigated by our plans to switch to bedrock or nitro by the end of the year.

