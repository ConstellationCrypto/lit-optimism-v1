# OptimismMintableERC721Factory



> OptimismMintableERC721Factory

Factory contract for creating OptimismMintableERC721 contracts.



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

### bridge

```solidity
function bridge() external view returns (address)
```

Address of the ERC721 bridge on this network.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### createStandardOptimismMintableERC721

```solidity
function createStandardOptimismMintableERC721(address _remoteToken, string _name, string _symbol) external nonpayable
```

Creates an instance of the standard ERC721.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _remoteToken | address | Address of the corresponding token on the other domain.
| _name | string | ERC721 name.
| _symbol | string | ERC721 symbol.

### initialize

```solidity
function initialize(address _bridge) external nonpayable
```

Initializes the factory.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _bridge | address | Address of the ERC721 bridge on this network.

### isStandardOptimismMintableERC721

```solidity
function isStandardOptimismMintableERC721(address) external view returns (bool)
```

Tracks addresses created by this factory.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

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

### OptimismMintableERC721Created

```solidity
event OptimismMintableERC721Created(address indexed remoteToken, address indexed localToken)
```

Emitted whenever a new OptimismMintableERC721 contract is created.



#### Parameters

| Name | Type | Description |
|---|---|---|
| remoteToken `indexed` | address | Address of the token on the remote domain. |
| localToken `indexed` | address | Address of the token on the this domain. |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |



