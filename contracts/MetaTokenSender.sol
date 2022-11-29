// SPDX-Lisence-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract RandomToken is ERC20 {

    constructor() ERC20("",""){}

    function freeMint(uint amount) public {
        _mint(msg.sender, amount);
    }
}

contract TokenSender{

    using ECDSA for bytes32;

    function getHash(address sender, uint amount, address recipient, address tokenContract) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(sender, amount, recipient, tokenContract));
    }

    function tokenTransfer(address sender, uint amount, address recipient, address tokenContract, bytes32 memory signature) public {
        
    }
}