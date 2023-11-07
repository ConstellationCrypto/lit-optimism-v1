// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/* Library Imports */
import { Lib_PredeployAddresses } from "../../libraries/constants/Lib_PredeployAddresses.sol";

/* Contract Imports */
import { L2StandardERC20 } from "../../standards/L2StandardERC20.sol";

/**
 * @title L2_FPE
 * @dev Note that unlike on Layer 1, Layer 2 accounts do not have a balance field.
 */
contract L2_FPE is L2StandardERC20 {
    /***************
     * Constructor *
     ***************/
    constructor(
        string memory _name,
        string memory _symbol,
        address l1FPE
    ) L2StandardERC20(Lib_PredeployAddresses.L2_STANDARD_BRIDGE, l1FPE, _name, _symbol) {}
}
