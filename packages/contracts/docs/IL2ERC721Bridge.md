# IL2ERC721Bridge









## Methods

### bridgeERC721

```solidity
function bridgeERC721(address _localToken, address _remoteToken, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | undefined
| _remoteToken | address | undefined
| _tokenId | uint256 | undefined
| _minGasLimit | uint32 | undefined
| _extraData | bytes | undefined

### bridgeERC721To

```solidity
function bridgeERC721To(address _localToken, address _remoteToken, address _to, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | undefined
| _remoteToken | address | undefined
| _to | address | undefined
| _tokenId | uint256 | undefined
| _minGasLimit | uint32 | undefined
| _extraData | bytes | undefined

### finalizeBridgeERC721

```solidity
function finalizeBridgeERC721(address _localToken, address _remoteToken, address _from, address _to, uint256 _tokenId, bytes _extraData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | undefined
| _remoteToken | address | undefined
| _from | address | undefined
| _to | address | undefined
| _tokenId | uint256 | undefined
| _extraData | bytes | undefined



## Events

### ERC721BridgeFailed

```solidity
event ERC721BridgeFailed(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge from the other network fails.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | Address of the token on this domain. |
| remoteToken `indexed` | address | Address of the token on the remote domain. |
| from `indexed` | address | Address that initiated bridging action. |
| to  | address | Address to receive the token. |
| tokenId  | uint256 | ID of the specific token deposited. |
| extraData  | bytes | Extra data for use on the client-side. |

### ERC721BridgeFinalized

```solidity
event ERC721BridgeFinalized(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge from the other network is finalized.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | Address of the token on this domain. |
| remoteToken `indexed` | address | Address of the token on the remote domain. |
| from `indexed` | address | Address that initiated bridging action. |
| to  | address | Address to receive the token. |
| tokenId  | uint256 | ID of the specific token deposited. |
| extraData  | bytes | Extra data for use on the client-side. |

### ERC721BridgeInitiated

```solidity
event ERC721BridgeInitiated(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge to the other network is initiated.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | Address of the token on this domain. |
| remoteToken `indexed` | address | Address of the token on the remote domain. |
| from `indexed` | address | Address that initiated bridging action. |
| to  | address | Address to receive the token. |
| tokenId  | uint256 | ID of the specific token deposited. |
| extraData  | bytes | Extra data for use on the client-side. |



