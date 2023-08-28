// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SampleNFT is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private _baseTokenURI;

    constructor(string memory baseTokenURI, uint256 amountToMint) ERC721("SampleNFT", "SNFT") {
        _baseTokenURI = baseTokenURI;

        for (uint256 i = 0; i < amountToMint; i++) {
            uint256 newTokenId = _tokenIds.current();
            _tokenIds.increment();
            _safeMint(msg.sender, newTokenId);
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
}
