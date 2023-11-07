// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Proxy__FPE_GasPriceOracle {
    address public gasPriceOracleAddress;

    constructor(address _gasPriceOracleAddress) {
        gasPriceOracleAddress = _gasPriceOracleAddress;
    }

    /**
     * Add the users that want to use FPE as the fee token
     */
    function useFPEAsFeeToken() public {
        FPE_GasPriceOracle(gasPriceOracleAddress).useFPEAsFeeToken();
    }

    /**
     * Add the users that want to use ETH as the fee token
     */
    function useETHAsFeeToken() public {
        FPE_GasPriceOracle(gasPriceOracleAddress).useETHAsFeeToken();
    }
}


interface FPE_GasPriceOracle {
  function useFPEAsFeeToken() external;
  function useETHAsFeeToken() external;
}