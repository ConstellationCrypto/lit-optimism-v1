# Backend to Disburse L2 Eth

## Context
In order for users to be able to test features, users should be able to request an amount of token.

## Proposed changes
REST API with Express that disburses tokens to a requested account

### POST
Request token for an account

Request body:
 - address

Example usage with Axios:

    axios.post('http://localhost:6000', {address:'0xf39Fd6e51aad88F6F4ce6aB8827279dffFb12267'})

## Summary of Approach
It is straightforward for users to fund accounts with small amounts of tokens for basic transactions. However, the simple initial design allows space for abuse (lack of rate-limiting).
