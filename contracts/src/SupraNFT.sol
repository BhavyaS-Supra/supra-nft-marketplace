// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SupraNFT
/// @notice Public-mint ERC-721 collection with per-token metadata URIs and a fixed max supply.
contract SupraNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000;

    uint256 private _nextTokenId;

    error MaxSupplyReached();
    error EmptyTokenURI();

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("Supra NFT", "SNFT") Ownable(msg.sender) {}

    /// @notice Mints the next token to the caller with the given metadata URI. Open to anyone.
    /// @param uri The token metadata URI (e.g. an IPFS or HTTPS link to an ERC-721 metadata JSON file).
    function mint(string calldata uri) external returns (uint256 tokenId) {
        if (bytes(uri).length == 0) revert EmptyTokenURI();
        if (totalSupply() >= MAX_SUPPLY) revert MaxSupplyReached();

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(msg.sender, tokenId, uri);
    }

    // --- Required overrides for combining ERC721Enumerable + ERC721URIStorage (OZ v5) ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
