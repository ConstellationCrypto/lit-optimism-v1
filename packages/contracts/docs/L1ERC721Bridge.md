# L1ERC721Bridge



> L1ERC721Bridge

The L1 ERC721 bridge is a contract which works together with the L2 ERC721 bridge to         make it possible to transfer ERC721 tokens between Optimism and Ethereum. This contract         acts as an escrow for ERC721 tokens deposted into L2.



## Methods

### bridgeERC721

```solidity
function bridgeERC721(address _localToken, address _remoteToken, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```

Initiates a bridge of an NFT to the caller&#39;s account on L2.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | Address of the ERC721 on this domain.
| _remoteToken | address | Address of the ERC721 on the remote domain.
| _tokenId | uint256 | Token ID to bridge.
| _minGasLimit | uint32 | Minimum gas limit for the bridge message on the other domain.
| _extraData | bytes | Optional data to forward to L2. Data supplied here will not be used to                     execute any code on L2 and is only emitted as extra data for the                     convenience of off-chain tooling.

### bridgeERC721To

```solidity
function bridgeERC721To(address _localToken, address _remoteToken, address _to, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```

Initiates a bridge of an NFT to some recipient&#39;s account on L2.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | Address of the ERC721 on this domain.
| _remoteToken | address | Address of the ERC721 on the remote domain.
| _to | address | Address to receive the token on the other domain.
| _tokenId | uint256 | Token ID to bridge.
| _minGasLimit | uint32 | Minimum gas limit for the bridge message on the other domain.
| _extraData | bytes | Optional data to forward to L2. Data supplied here will not be used to                     execute any code on L2 and is only emitted as extra data for the                     convenience of off-chain tooling.

### deposits

```solidity
function deposits(address, address, uint256) external view returns (bool)
```

Mapping of L1 token to L2 token to ID to boolean, indicating if the given L1 token         by ID was deposited for a given L2 token.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### finalizeBridgeERC721

```solidity
function finalizeBridgeERC721(address _localToken, address _remoteToken, address _from, address _to, uint256 _tokenId, bytes _extraData) external nonpayable
```

Completes an ERC721 bridge from the other domain and sends the ERC721 token to the         recipient on this domain.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | Address of the ERC721 token on this domain.
| _remoteToken | address | Address of the ERC721 token on the other domain.
| _from | address | Address that triggered the bridge on the other domain.
| _to | address | Address to receive the token on this domain.
| _tokenId | uint256 | ID of the token being deposited.
| _extraData | bytes | Optional data to forward to L2. Data supplied here will not be used to                     execute any code on L2 and is only emitted as extra data for the                     convenience of off-chain tooling.

### initialize

```solidity
function initialize(address _messenger, address _otherBridge) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _messenger | address | Address of the CrossDomainMessenger on this network.
| _otherBridge | address | Address of the ERC721 bridge on the other network.

### messenger

```solidity
function messenger() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### otherBridge

```solidity
function otherBridge() external view returns (address)
```

Address of the bridge on the other network.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined



## Events

### ERC721BridgeFinalized

```solidity
event ERC721BridgeFinalized(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge from the other network is finalized.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | undefined |
| remoteToken `indexed` | address | undefined |
| from `indexed` | address | undefined |
| to  | address | undefined |
| tokenId  | uint256 | undefined |
| extraData  | bytes | undefined |

### ERC721BridgeInitiated

```solidity
event ERC721BridgeInitiated(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge to the other network is initiated.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | undefined |
| remoteToken `indexed` | address | undefined |
| from `indexed` | address | undefined |
| to  | address | undefined |
| tokenId  | uint256 | undefined |
| extraData  | bytes | undefined |



