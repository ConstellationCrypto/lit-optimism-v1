# L2ERC721Bridge



> L2ERC721Bridge

The L2 ERC721 bridge is a contract which works together with the L1 ERC721 bridge to         make it possible to transfer ERC721 tokens between Optimism and Ethereum. This contract         acts as a minter for new tokens when it hears about deposits into the L1 ERC721 bridge.         This contract also acts as a burner for tokens being withdrawn.



## Methods

### VERSION

```solidity
function VERSION() external view returns (uint8)
```

Contract version number.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### bridgeERC721

```solidity
function bridgeERC721(address _localToken, address _remoteToken, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```

Initiates a bridge of an NFT to the caller&#39;s account on L1.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | Address of the ERC721 on this domain.
| _remoteToken | address | Address of the ERC721 on the remote domain.
| _tokenId | uint256 | Token ID to bridge.
| _minGasLimit | uint32 | Minimum gas limit for the bridge message on the other domain.
| _extraData | bytes | Optional data to forward to L1. Data supplied here will not be used to                     execute any code on L1 and is only emitted as extra data for the                     convenience of off-chain tooling.

### bridgeERC721To

```solidity
function bridgeERC721To(address _localToken, address _remoteToken, address _to, uint256 _tokenId, uint32 _minGasLimit, bytes _extraData) external nonpayable
```

Initiates a bridge of an NFT to some recipient&#39;s account on L1.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _localToken | address | Address of the ERC721 on this domain.
| _remoteToken | address | Address of the ERC721 on the remote domain.
| _to | address | Address to receive the token on the other domain.
| _tokenId | uint256 | Token ID to bridge.
| _minGasLimit | uint32 | Minimum gas limit for the bridge message on the other domain.
| _extraData | bytes | Optional data to forward to L1. Data supplied here will not be used to                     execute any code on L1 and is only emitted as extra data for the                     convenience of off-chain tooling.

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
| _extraData | bytes | Optional data to forward to L1. Data supplied here will not be used to                     execute any code on L1 and is only emitted as extra data for the                     convenience of off-chain tooling.

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

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined



## Events

### ERC721BridgeFailed

```solidity
event ERC721BridgeFailed(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 tokenId, bytes extraData)
```

Emitted when an ERC721 bridge from the other network fails.



#### Parameters

| Name | Type | Description |
|---|---|---|
| localToken `indexed` | address | undefined |
| remoteToken `indexed` | address | undefined |
| from `indexed` | address | undefined |
| to  | address | undefined |
| tokenId  | uint256 | undefined |
| extraData  | bytes | undefined |

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

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |



