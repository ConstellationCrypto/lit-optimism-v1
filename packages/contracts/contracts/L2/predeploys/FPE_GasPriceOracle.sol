// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/* Library Imports */
import { Lib_PredeployAddresses } from "../../libraries/constants/Lib_PredeployAddresses.sol";

/* Contract Imports */
import { L2StandardBridge } from "../messaging/L2StandardBridge.sol";
import { L2StandardERC20 } from "../../standards/L2StandardERC20.sol";
import { OVM_GasPriceOracle } from "./OVM_GasPriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/* Contract Imports */
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title FPE_GasPriceOracle
 */
contract FPE_GasPriceOracle {
    using SafeERC20 for IERC20;

    /*************
     * Constants *
     *************/

    // Minimum FPE balance that can be withdrawn in a single withdrawal.
    uint256 public constant MIN_WITHDRAWAL_AMOUNT = 0;

    /*************
     * Variables *
     *************/

    // Owner address
    address private _owner;

    // Address on L1 that will hold the fees once withdrawn. Dynamically initialized within l2geth.
    address public l1FeeWallet;

    // L2 FPE token address
    address public l2FPEAddress;

    // The maximum value of ETH and FPE
    uint256 public maxPriceRatio = 5000;

    // The minimum value of ETH and FPE
    uint256 public minPriceRatio = 500;

    // Toggle whether using Fee Paying ERC20
    // Stored at storage slot 5, gets its own slot because the compiler won't pack it
    // with 2 uint256's
    bool public usingFeePayingERC20;

    // The price ratio of ETH and FPE
    // Stored at storage slot 6
    uint256 public priceRatio;

    // the number of decimals of the price ratio
    uint256 public priceRatioDecimals;

    // Gas price oracle address
    address public gasPriceOracleAddress = 0x420000000000000000000000000000000000000F;

    /*************
     *  Events   *
     *************/

    event TransferOwnership(address, address);
    // Emits an event with the address of the fee token being switched to
    event FeeTokenSwitchedTo(address);
    event SetPriceRatio(address, uint256);
    event SetMaxPriceRatio(address, uint256);
    event SetMinPriceRatio(address, uint256);
    event UpdateGasPriceOracleAddress(address, address);
    event Withdraw(address, address);
    event PriceRatioDecimalsUpdated(uint256);

    /**********************
     * Function Modifiers *
     **********************/

    modifier onlyNotInitialized() {
        require(address(l1FeeWallet) == address(0), "Contract has been initialized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "caller is not the owner");
        _;
    }

    /********************
     * Public Functions *
     ********************/

    /**
     * transfer ownership
     * @param _newOwner new owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        address oldOwner = _owner;
        _owner = _newOwner;
        emit TransferOwnership(oldOwner, _newOwner);
    }

    /**
     * Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * Initialize l1FeeWallet and l2FPEAddress.
     */
    function initialize(address _l1FeeWallet, address _l2FPEAddress) external onlyNotInitialized {
        require(
            _l1FeeWallet != address(0) && _l2FPEAddress != address(0),
            "l1 fee wallet cannot be 0 address, and l2 fpe address cannot be 0 address"
        );
        l1FeeWallet = _l1FeeWallet;
        l2FPEAddress = _l2FPEAddress;

        // Initialize the parameters
        _owner = msg.sender;
        gasPriceOracleAddress = 0x420000000000000000000000000000000000000F;
        maxPriceRatio = 5000;
        priceRatio = 500;
        minPriceRatio = 1;
        priceRatioDecimals = 6;
        usingFeePayingERC20 = false;
    }

    /**
     * Add the users that want to use FPE as the fee token
     */
    function useFPEAsFeeToken() external onlyOwner {
        usingFeePayingERC20 = true;
        emit FeeTokenSwitchedTo(l2FPEAddress);
    }

    /**
     * Add the users that want to use ETH as the fee token
     */
    function useETHAsFeeToken() external onlyOwner {
        usingFeePayingERC20 = false;
        emit FeeTokenSwitchedTo(Lib_PredeployAddresses.OVM_ETH);
    }

    /**
     * Update the price ratio of ETH and FPE
     * @param _priceRatio the price ratio of ETH and FPE
     */
    function setPriceRatio(uint256 _priceRatio) external onlyOwner {
        require(
            _priceRatio <= maxPriceRatio && _priceRatio >= minPriceRatio,
            "price ratio must not be greater than the maximum or less than the minimum"
        );
        priceRatio = _priceRatio;
        emit SetPriceRatio(owner(), _priceRatio);
    }

    /**
     * Allows the owner to modify the decimals.
     * @param _decimals New decimals
     */
    // slither-disable-next-line external-function
    function setPriceRatioDecimals(uint256 _decimals) public onlyOwner {
        priceRatioDecimals = _decimals;
        emit PriceRatioDecimalsUpdated(_decimals);
    }

    /**
     * Update the maximum price ratio of ETH and FPE
     * @param _maxPriceRatio the maximum price ratio of ETH and FPE
     */
    function setMaxPriceRatio(uint256 _maxPriceRatio) external onlyOwner {
        require(
            _maxPriceRatio >= minPriceRatio && _maxPriceRatio > 0,
            "Maximum price ratio must not be less than minimum price ratio and greater than 0"
        );
        maxPriceRatio = _maxPriceRatio;
        emit SetMaxPriceRatio(owner(), _maxPriceRatio);
    }

    /**
     * Update the minimum price ratio of ETH and FPE
     * @param _minPriceRatio the minimum price ratio of ETH and FPE
     */
    function setMinPriceRatio(uint256 _minPriceRatio) external onlyOwner {
        require(
            _minPriceRatio <= maxPriceRatio && _minPriceRatio > 0,
            "Minimum price ratio must be > 0 and <= maximum price ratio"
        );
        minPriceRatio = _minPriceRatio;
        emit SetMinPriceRatio(owner(), _minPriceRatio);
    }

    /**
     * Update the gas oracle address
     * @param _gasPriceOracleAddress gas oracle address
     */
    function updateGasPriceOracleAddress(address _gasPriceOracleAddress) external onlyOwner {
        require(Address.isContract(_gasPriceOracleAddress), "Account is EOA");
        require(_gasPriceOracleAddress != address(0), "cannot update to the zero address");
        gasPriceOracleAddress = _gasPriceOracleAddress;
        emit UpdateGasPriceOracleAddress(owner(), _gasPriceOracleAddress);
    }

    /**
     * Get L1 FPE fee for fee estimation
     * @param _txData the data payload
     */
    function getL1FPEFee(bytes memory _txData) external view returns (uint256) {
        OVM_GasPriceOracle gasPriceOracleContract = OVM_GasPriceOracle(gasPriceOracleAddress);
        return gasPriceOracleContract.getL1Fee(_txData) * priceRatio;
    }

    /**
     * withdraw FPE tokens to l1 fee wallet
     */
    function withdraw() external {
        require(
            L2StandardERC20(l2FPEAddress).balanceOf(address(this)) >= MIN_WITHDRAWAL_AMOUNT,
            // solhint-disable-next-line max-line-length
            "FPE_GasPriceOracle: withdrawal amount must be greater than minimum withdrawal amount"
        );
        // slither-disable-next-line reentrancy-events
        L2StandardBridge(Lib_PredeployAddresses.L2_STANDARD_BRIDGE).withdrawTo(
            l2FPEAddress,
            l1FeeWallet,
            L2StandardERC20(l2FPEAddress).balanceOf(address(this)),
            0,
            bytes("")
        );
        // slither-disable-next-line reentrancy-events
        emit Withdraw(owner(), l1FeeWallet);
    }
}
