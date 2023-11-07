// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Precompiles {
    function expmod(uint256 base, uint256 e, uint256 m) public returns (uint256 o) {
        assembly {
            // define pointer
            let p := mload(0x40)
            // store data assembly-favouring ways
            mstore(p, 0x20) // Length of Base
            mstore(add(p, 0x20), 0x20) // Length of Exponent
            mstore(add(p, 0x40), 0x20) // Length of Modulus
            mstore(add(p, 0x60), base) // Base
            mstore(add(p, 0x80), e) // Exponent
            mstore(add(p, 0xa0), m) // Modulus
            if iszero(staticcall(sub(gas(), 2000), 0x05, p, 0xc0, p, 0x20)) {
                revert(0, 0)
            }
            // data
            o := mload(p)
        }
    }

    function blsG1Add(bytes32[8] memory input) public view returns (bytes32[4] memory) {
        bytes32[4] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xfe, input, 0x100, output, 0x80)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsG1Mul(bytes32[5] memory input) public view returns (bytes32[4] memory) {
        bytes32[4] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xfd, input, 0xa0, output, 0x80)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsG1MultiExp(bytes32[5] memory input) public view returns (bytes32[4] memory) {
        bytes32[4] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xfc, input, 0xa0, output, 0x80)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsG2Add(bytes32[16] memory input) public view returns (bytes32[8] memory) {
        bytes32[8] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xfb, input, 0x200, output, 0x100)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsG2Mul(bytes32[9] memory input) public view returns (bytes32[8] memory) {
        bytes32[8] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xfa, input, 0x120, output, 0x100)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsG2MultiExp(bytes32[9] memory input) public view returns (bytes32[8] memory) {
        bytes32[8] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xf9, input, 0x120, output, 0x100)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsPairing(bytes32[24] memory input) public view returns (bytes32[1] memory) {
        bytes32[1] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xf8, input, 0x300, output, 0x20)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsMapG1(bytes32[2] memory input) public view returns (bytes32[4] memory) {
        bytes32[4] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xf7, input, 0x40, output, 0x80)) {
                revert(0, 0)
            }
        }
        return output;
    }

    function blsMapG2(bytes32[4] memory input) public view returns (bytes32[8] memory) {
        bytes32[8] memory output;
        assembly {
            if iszero(staticcall(not(0), 0xf6, input, 0x80, output, 0x100)) {
                revert(0, 0)
            }
        }
        return output;
    }

    // Lit Protocol provided
    function derive() public view returns (bytes memory) {
        bytes memory output;

        bytes memory args = hex"010000000c636169742d736974682d69640000002b4c49545f48445f4b45595f49445f4b3235365f584d443a5348412d3235365f535357555f524f5f4e554c5f0000000a020fae233d73b0d32dbbf10f0b942d869b45dd2856f7fcd9626f2d6e32ff2b0943033ce30488ede264ef6b358337b0ecfa556debfb2d04a9124609dc0b5feba816cb02e9d5169aef5e11bb12a6d74dd14a516975afb53be2771503d1797b1bcc5c05d203c5b60f0f896f154cd1a2a66213f6a60670a8753885dc498188ded2e795ffd35b022213cdaaad5188b94e9f381300facebf783775d3a39cf1940d14de09867b8f22034b0967f3f536549d4ed18424f615556cb0addd262b3a2beadb67a62459b44c9903fb7e452b1402623f0961e3c227de2e4a080102556f824debd0dc097127b77b8002a96816b6e92fddbc34ab5ce7b340c68701db544f3929f77e1563a34fb7d91c91035b52660671d8b6997b4088a0777d2c89132eab47146a4d692c4a82513893d3910234b3e7701907ff53cb3e48116319c1949709101dc6d9b55c54cfa2813e109a59";

        assembly {
            if iszero(
                // 0x10 for the precompile address
                // add(args, 32) for ???
                // 0x18E for the size of the input (398 bytes)
                // output for the output
                // 0x21 for the size of the output flag (33 byte)
                staticcall(not(0), 0x10, add(args, 32), 0x18E, output, 0x21)
            ) {
                revert(0, 0)
            }
        }

        return output;
    }

    function derive2() public view returns (bytes memory) {
        address precompile = 0x0000000000000000000000000000000000000100;

        bytes memory args = hex"010000000c636169742d736974682d69640000002b4c49545f48445f4b45595f49445f4b3235365f584d443a5348412d3235365f535357555f524f5f4e554c5f0000000a020fae233d73b0d32dbbf10f0b942d869b45dd2856f7fcd9626f2d6e32ff2b0943033ce30488ede264ef6b358337b0ecfa556debfb2d04a9124609dc0b5feba816cb02e9d5169aef5e11bb12a6d74dd14a516975afb53be2771503d1797b1bcc5c05d203c5b60f0f896f154cd1a2a66213f6a60670a8753885dc498188ded2e795ffd35b022213cdaaad5188b94e9f381300facebf783775d3a39cf1940d14de09867b8f22034b0967f3f536549d4ed18424f615556cb0addd262b3a2beadb67a62459b44c9903fb7e452b1402623f0961e3c227de2e4a080102556f824debd0dc097127b77b8002a96816b6e92fddbc34ab5ce7b340c68701db544f3929f77e1563a34fb7d91c91035b52660671d8b6997b4088a0777d2c89132eab47146a4d692c4a82513893d3910234b3e7701907ff53cb3e48116319c1949709101dc6d9b55c54cfa2813e109a59";

        (bool success, bytes memory data) = precompile.staticcall(args);

        if (success) {
            return data;
        } else {
            return hex"1234";
        }
    }

    function derive3(bytes calldata input) public view returns (bool, bytes memory) {
        address precompile = 0x00000000000000000000000000000000000000F5;
        (bool success, bytes memory data) = precompile.staticcall(input);
        return (success, data);
    }
}
