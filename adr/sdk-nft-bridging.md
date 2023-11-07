# Support for NFT Bridging
## Change Log
Initial draft: Albert Chu (Big Albs) - 7/27/22
Polishing: Parker Jou - 8/17/22

## Context
The Optimism SDK includes a CrossChainMessenger class which can handle deposits/withdrawals of ERC-20 compatible tokens (including native eth which is treated as a special ERC-20 token). NFT bridging is currently deployed automatically with constellation, but using it to bridge NFTs requires the user load in the bridge contract via abi and understand how to pass arbitrary cross-chain messages whereas the workflow for ERC-20 tokens abstracts over loading the bridge contract and has dedicated functions to handle deposits + bridging.

We want to provide built-in support for NFT bridging in the same pattern as is supported for ERC-20 tokens.

## Proposed Changes

Adding functionality to the CrossChainMessenger class in `packages/sdk/src` to interact with NFTs using the existing pre-deployed L2 NFT bridge + Token Factory and deployed L1 NFT bridge (based off of the NFT bridging code in `integration tests` and the existing functionality of the CrossChainMessenger class).

Add functionality to env.ts and utils.ts in `integration-tests/test/shared` to load in the pre-deployed L2 NFT bridge and deployed L1 NFT bridge to the environment and messenger.
- In order for this to work, had to make L1ERC721Bridge a required property of OEL1Contracts and filled in dummy values of '0x11' as const for the default values of L1ERC721Bridge in L2 nets other than optimism.

Adding an NFT bridge in `packages/sdk/src/adapters` as an extension of the standard bridge adapter to support the new functionality in CrossChainMessenger that abstracts over most of the nitty-gritty in a similar way to the Standard Bridge.
- To handle bridge selection in CrossChainMessenger/token support cleanly, implement supportsTokenPair in NFT Bridge by creating a token contract from the given address and checking all corresponding addresses match. (Note: Albert explored using 4bytes codes and the supportsInterface method, but because a token contract must be created to compare information, this is ineffective)

Specifically, the class should enable a user to:
- initiate withdrawals
- track the withdrawals and execute the transaction on the L1 once ready
- handle deposits.
(Exact example usage below)

Other considerations:
- make it easy to support same functionality for ERC-1155s
- burn NFTs
- mint NFTs

Adding integration tests to ensure the class is working correctly both ways.

Adding interactive (runnable) example to demonstrate how to use the class to bridge NFTs.

__Approve__

To approve the bridge to operate a token, call approveERC721 with the address of the corresponding bridge.

    await l1ERC721.approveERC721(
        crossChainMessenger.contracts.l1.L1ERC721Bridge.address)

__Deposit__

To deposit a token, call depositERC721 with
 - l1TokenAddress
 - l2TokenAddress
 - Token_ID
 - { recipient, l2GasLimit, extra_data, overrides } (All optional)

(Extra data: Extra data to forward to L2. Data supplied here will not be used to execute any code on L2 and is only emitted as extra data for the convenience of off-chain tooling)

ex.

    await crossChainMessenger.depositERC721(
                l1TokenAddress,
                l2TokenAddress,
                TOKEN_ID,
                { recipient: aliceAddress, l2Gaslimit: gasLimit })

__Withdraw__

To withdraw a token, call withdrawERC721 with
 - l1TokenAddress
 - l2TokenAddress
 - Token_ID
 - { recipient, extra_data, overrides } (All optional)

ex.

    await crossChainMessenger.withdrawERC721(
                l1TokenAddress,
                l2TokenAddress,
                TOKEN_ID,
                { recipient: aliceAddress, extra_data: extra_data })


## Positives/Negatives
Adding functionality to the CrossChainMessenger class as opposed to writing a new class specifically for ERC-721s exposes a much cleaner interface to use, but may be more complex to maintain if we wish to update to newer versions of optimism's CrossChainMessenger class.
