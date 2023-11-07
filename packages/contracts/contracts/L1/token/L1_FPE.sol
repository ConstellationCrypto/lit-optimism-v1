pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract L1_FPE is ERC20, Ownable {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 maxSupply
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, maxSupply * 10**18);
    }
}
