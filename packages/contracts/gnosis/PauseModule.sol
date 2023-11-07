// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import { L1CrossDomainMessenger } from "../L1/messaging/L1CrossDomainMessenger.sol";

/**
 * @title PauseModule
 * @dev The PauseModule is a Gnosis Safe Module designed to allow any of the owners of the safe
 * to pause the finalization of messages on the Proxy__L1CrossDomainMessenger. The module must be
 * enabled on the Gnosis safe and the safe must own the Proxy__L1CrossDomainMessenger
 * contract in order for this module to work.
 *
 */
contract PauseModule {
    GnosisSafe _safe;
    L1CrossDomainMessenger _messengerContract;

    constructor(GnosisSafe safe, L1CrossDomainMessenger messengerContract) {
        _safe = safe;
        _messengerContract = messengerContract;
    }

    function pauseL1CrossDomainMessenger() public {
        require(_safe.isOwner(msg.sender), "msg.sender is not an owner of the safe");
        bytes memory data = abi.encodeWithSignature("pause()");
        require(
            _safe.execTransactionFromModule(
                address(_messengerContract),
                0,
                data,
                Enum.Operation.Call
            ),
            "Failed to execute pause transaction"
        );
    }
}
