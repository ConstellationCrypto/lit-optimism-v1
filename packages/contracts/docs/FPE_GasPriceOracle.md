# FPE_GasPriceOracle



> FPE_GasPriceOracle





## Methods

### MIN_WITHDRAWAL_AMOUNT

```solidity
function MIN_WITHDRAWAL_AMOUNT() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### gasPriceOracleAddress

```solidity
function gasPriceOracleAddress() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getL1FPEFee

```solidity
function getL1FPEFee(bytes _txData) external view returns (uint256)
```

Get L1 FPE fee for fee estimation



#### Parameters

| Name | Type | Description |
|---|---|---|
| _txData | bytes | the data payload

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### initialize

```solidity
function initialize(address _l1FeeWallet, address _l2FPEAddress) external nonpayable
```

Initialize l1FeeWallet and l2FPEAddress.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _l1FeeWallet | address | undefined
| _l2FPEAddress | address | undefined

### l1FeeWallet

```solidity
function l1FeeWallet() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### l2FPEAddress

```solidity
function l2FPEAddress() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### maxPriceRatio

```solidity
function maxPriceRatio() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### minPriceRatio

```solidity
function minPriceRatio() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### owner

```solidity
function owner() external view returns (address)
```

Returns the address of the current owner.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### priceRatio

```solidity
function priceRatio() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### priceRatioDecimals

```solidity
function priceRatioDecimals() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### setMaxPriceRatio

```solidity
function setMaxPriceRatio(uint256 _maxPriceRatio) external nonpayable
```

Update the maximum price ratio of ETH and FPE



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxPriceRatio | uint256 | the maximum price ratio of ETH and FPE

### setMinPriceRatio

```solidity
function setMinPriceRatio(uint256 _minPriceRatio) external nonpayable
```

Update the minimum price ratio of ETH and FPE



#### Parameters

| Name | Type | Description |
|---|---|---|
| _minPriceRatio | uint256 | the minimum price ratio of ETH and FPE

### setPriceRatio

```solidity
function setPriceRatio(uint256 _priceRatio) external nonpayable
```

Update the price ratio of ETH and FPE



#### Parameters

| Name | Type | Description |
|---|---|---|
| _priceRatio | uint256 | the price ratio of ETH and FPE

### setPriceRatioDecimals

```solidity
function setPriceRatioDecimals(uint256 _decimals) external nonpayable
```

Allows the owner to modify the decimals.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _decimals | uint256 | New decimals

### transferOwnership

```solidity
function transferOwnership(address _newOwner) external nonpayable
```

transfer ownership



#### Parameters

| Name | Type | Description |
|---|---|---|
| _newOwner | address | new owner address

### updateGasPriceOracleAddress

```solidity
function updateGasPriceOracleAddress(address _gasPriceOracleAddress) external nonpayable
```

Update the gas oracle address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _gasPriceOracleAddress | address | gas oracle address

### useETHAsFeeToken

```solidity
function useETHAsFeeToken() external nonpayable
```

Add the users that want to use ETH as the fee token




### useFPEAsFeeToken

```solidity
function useFPEAsFeeToken() external nonpayable
```

Add the users that want to use FPE as the fee token




### usingFeePayingERC20

```solidity
function usingFeePayingERC20() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### withdraw

```solidity
function withdraw() external nonpayable
```

withdraw FPE tokens to l1 fee wallet






## Events

### FeeTokenSwitchedTo

```solidity
event FeeTokenSwitchedTo(address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |

### PriceRatioDecimalsUpdated

```solidity
event PriceRatioDecimalsUpdated(uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | uint256 | undefined |

### SetMaxPriceRatio

```solidity
event SetMaxPriceRatio(address, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | uint256 | undefined |

### SetMinPriceRatio

```solidity
event SetMinPriceRatio(address, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | uint256 | undefined |

### SetPriceRatio

```solidity
event SetPriceRatio(address, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | uint256 | undefined |

### TransferOwnership

```solidity
event TransferOwnership(address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | address | undefined |

### UpdateGasPriceOracleAddress

```solidity
event UpdateGasPriceOracleAddress(address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | address | undefined |

### Withdraw

```solidity
event Withdraw(address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | address | undefined |



