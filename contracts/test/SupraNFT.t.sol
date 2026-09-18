// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../src/SupraNFT.sol";

contract SupraNFTTest is Test, ERC721Holder {
    SupraNFT nft;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string constant URI_A = "ipfs://bafybeigd/1.json";
    string constant URI_B = "ipfs://bafybeigd/2.json";

    function setUp() public {
        nft = new SupraNFT();
    }

    function test_InitialState() public view {
        assertEq(nft.name(), "Supra NFT");
        assertEq(nft.symbol(), "SNFT");
        assertEq(nft.totalSupply(), 0);
        assertEq(nft.MAX_SUPPLY(), 10_000);
        assertEq(nft.owner(), address(this));
    }

    function test_Mint() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint(URI_A);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), alice);
        assertEq(nft.tokenURI(0), URI_A);
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.balanceOf(alice), 1);
    }

    function test_Mint_IsPublic() public {
        vm.prank(alice);
        nft.mint(URI_A);

        vm.prank(bob);
        nft.mint(URI_B);

        assertEq(nft.ownerOf(0), alice);
        assertEq(nft.ownerOf(1), bob);
        assertEq(nft.totalSupply(), 2);
    }

    function test_Mint_SequentialTokenIds() public {
        vm.startPrank(alice);
        uint256 id0 = nft.mint(URI_A);
        uint256 id1 = nft.mint(URI_B);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    function test_Mint_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit SupraNFT.NFTMinted(alice, 0, URI_A);

        vm.prank(alice);
        nft.mint(URI_A);
    }

    function test_Mint_EnumerableTracksOwner() public {
        vm.startPrank(alice);
        nft.mint(URI_A);
        nft.mint(URI_B);
        vm.stopPrank();

        assertEq(nft.balanceOf(alice), 2);
        assertEq(nft.tokenOfOwnerByIndex(alice, 0), 0);
        assertEq(nft.tokenOfOwnerByIndex(alice, 1), 1);
    }

    function test_RevertWhen_MintWithEmptyURI() public {
        vm.prank(alice);
        vm.expectRevert(SupraNFT.EmptyTokenURI.selector);
        nft.mint("");
    }

    function test_RevertWhen_MaxSupplyReached() public {
        uint256 maxSupply = nft.MAX_SUPPLY();
        for (uint256 i = 0; i < maxSupply; i++) {
            nft.mint(URI_A);
        }
        assertEq(nft.totalSupply(), maxSupply);

        vm.expectRevert(SupraNFT.MaxSupplyReached.selector);
        nft.mint(URI_A);
    }

    function testFuzz_Mint_AlwaysIncrementsSupply(uint8 mintCount) public {
        vm.assume(mintCount > 0 && mintCount <= 20);
        for (uint256 i = 0; i < mintCount; i++) {
            nft.mint(URI_A);
        }
        assertEq(nft.totalSupply(), mintCount);
    }

    function test_SupportsInterface_ERC721() public view {
        // ERC721 interface id
        assertTrue(nft.supportsInterface(0x80ac58cd));
        // ERC721Metadata interface id
        assertTrue(nft.supportsInterface(0x5b5e139f));
        // ERC721Enumerable interface id
        assertTrue(nft.supportsInterface(0x780e9d63));
    }
}
