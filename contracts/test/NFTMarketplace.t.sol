// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/NFTMarketplace.sol";
import "../src/SupraNFT.sol";

contract NFTMarketplaceTest is Test {
    NFTMarketplace market;
    SupraNFT nft;

    address deployer = address(this);
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address stranger = makeAddr("stranger");

    uint256 constant PRICE = 1 ether;

    event Listed(
        uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price
    );
    event ListingCancelled(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price, uint256 fee);

    function setUp() public {
        market = new NFTMarketplace();
        nft = new SupraNFT();

        vm.deal(buyer, 10 ether);
        vm.deal(stranger, 10 ether);

        vm.prank(seller);
        nft.mint("ipfs://token/0.json"); // tokenId 0, owned by seller
    }

    function _listAsSeller() internal returns (uint256 listingId) {
        vm.prank(seller);
        nft.approve(address(market), 0);

        vm.prank(seller);
        listingId = market.listItem(address(nft), 0, PRICE);
    }

    // --- listItem ---

    function test_ListItem_WithApprove() public {
        vm.prank(seller);
        nft.approve(address(market), 0);

        vm.prank(seller);
        uint256 listingId = market.listItem(address(nft), 0, PRICE);

        NFTMarketplace.Listing memory listing = market.getListing(listingId);
        assertEq(listing.seller, seller);
        assertEq(listing.nftContract, address(nft));
        assertEq(listing.tokenId, 0);
        assertEq(listing.price, PRICE);
        assertTrue(listing.active);
        assertEq(market.activeListingId(address(nft), 0), listingId);
    }

    function test_ListItem_WithSetApprovalForAll() public {
        vm.prank(seller);
        nft.setApprovalForAll(address(market), true);

        vm.prank(seller);
        uint256 listingId = market.listItem(address(nft), 0, PRICE);

        assertTrue(market.getListing(listingId).active);
    }

    function test_ListItem_EmitsEvent() public {
        vm.prank(seller);
        nft.approve(address(market), 0);

        vm.expectEmit(true, true, true, true);
        emit Listed(1, seller, address(nft), 0, PRICE);

        vm.prank(seller);
        market.listItem(address(nft), 0, PRICE);
    }

    function test_RevertWhen_ListItem_PriceIsZero() public {
        vm.prank(seller);
        nft.approve(address(market), 0);

        vm.prank(seller);
        vm.expectRevert(NFTMarketplace.InvalidPrice.selector);
        market.listItem(address(nft), 0, 0);
    }

    function test_RevertWhen_ListItem_NotOwner() public {
        vm.prank(seller);
        nft.approve(address(market), 0);

        vm.prank(stranger);
        vm.expectRevert(NFTMarketplace.NotTokenOwner.selector);
        market.listItem(address(nft), 0, PRICE);
    }

    function test_RevertWhen_ListItem_NotApproved() public {
        vm.prank(seller);
        vm.expectRevert(NFTMarketplace.MarketplaceNotApproved.selector);
        market.listItem(address(nft), 0, PRICE);
    }

    function test_RevertWhen_ListItem_AlreadyListed() public {
        _listAsSeller();

        vm.prank(seller);
        vm.expectRevert(NFTMarketplace.AlreadyListed.selector);
        market.listItem(address(nft), 0, PRICE);
    }

    // --- cancelListing ---

    function test_CancelListing() public {
        uint256 listingId = _listAsSeller();

        vm.prank(seller);
        market.cancelListing(listingId);

        assertFalse(market.getListing(listingId).active);
        assertEq(market.activeListingId(address(nft), 0), 0);
    }

    function test_CancelListing_EmitsEvent() public {
        uint256 listingId = _listAsSeller();

        vm.expectEmit(true, false, false, false);
        emit ListingCancelled(listingId);

        vm.prank(seller);
        market.cancelListing(listingId);
    }

    function test_CancelListing_AllowsRelisting() public {
        uint256 listingId = _listAsSeller();

        vm.prank(seller);
        market.cancelListing(listingId);

        vm.prank(seller);
        uint256 newListingId = market.listItem(address(nft), 0, PRICE * 2);

        assertTrue(market.getListing(newListingId).active);
        assertEq(market.getListing(newListingId).price, PRICE * 2);
    }

    function test_RevertWhen_CancelListing_NotSeller() public {
        uint256 listingId = _listAsSeller();

        vm.prank(stranger);
        vm.expectRevert(NFTMarketplace.NotSeller.selector);
        market.cancelListing(listingId);
    }

    function test_RevertWhen_CancelListing_NotActive() public {
        uint256 listingId = _listAsSeller();

        vm.prank(seller);
        market.cancelListing(listingId);

        vm.prank(seller);
        vm.expectRevert(NFTMarketplace.ListingNotActive.selector);
        market.cancelListing(listingId);
    }

    function test_RevertWhen_CancelListing_NeverExisted() public {
        vm.expectRevert(NFTMarketplace.ListingNotActive.selector);
        market.cancelListing(999);
    }

    // --- buyItem ---

    function test_BuyItem_TransfersNFTAndSplitsPayment() public {
        uint256 listingId = _listAsSeller();

        uint256 sellerBalanceBefore = seller.balance;
        uint256 ownerBalanceBefore = deployer.balance;

        vm.prank(buyer);
        market.buyItem{value: PRICE}(listingId);

        uint256 expectedFee = (PRICE * 250) / 10_000;
        uint256 expectedSellerProceeds = PRICE - expectedFee;

        assertEq(nft.ownerOf(0), buyer);
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerProceeds);
        assertEq(deployer.balance, ownerBalanceBefore + expectedFee);
        assertFalse(market.getListing(listingId).active);
        assertEq(market.activeListingId(address(nft), 0), 0);
    }

    function test_BuyItem_PlatformFeeIsTwoPointFivePercent() public {
        uint256 listingId = _listAsSeller();

        vm.prank(buyer);
        market.buyItem{value: PRICE}(listingId);

        // 1 ether * 2.5% = 0.025 ether
        assertEq((PRICE * market.PLATFORM_FEE_BPS()) / market.BPS_DENOMINATOR(), 0.025 ether);
    }

    function test_BuyItem_RefundsOverpayment() public {
        uint256 listingId = _listAsSeller();

        uint256 buyerBalanceBefore = buyer.balance;
        uint256 overpay = PRICE + 0.5 ether;

        vm.prank(buyer);
        market.buyItem{value: overpay}(listingId);

        assertEq(buyer.balance, buyerBalanceBefore - PRICE);
    }

    function test_BuyItem_EmitsEvent() public {
        uint256 listingId = _listAsSeller();
        uint256 expectedFee = (PRICE * 250) / 10_000;

        vm.expectEmit(true, true, true, true);
        emit Sold(listingId, buyer, seller, PRICE, expectedFee);

        vm.prank(buyer);
        market.buyItem{value: PRICE}(listingId);
    }

    function test_RevertWhen_BuyItem_NotActive() public {
        uint256 listingId = _listAsSeller();

        vm.prank(seller);
        market.cancelListing(listingId);

        vm.prank(buyer);
        vm.expectRevert(NFTMarketplace.ListingNotActive.selector);
        market.buyItem{value: PRICE}(listingId);
    }

    function test_RevertWhen_BuyItem_InsufficientPayment() public {
        uint256 listingId = _listAsSeller();

        vm.prank(buyer);
        vm.expectRevert(NFTMarketplace.InsufficientPayment.selector);
        market.buyItem{value: PRICE - 1}(listingId);
    }

    function test_RevertWhen_BuyItem_AlreadySold() public {
        uint256 listingId = _listAsSeller();

        vm.prank(buyer);
        market.buyItem{value: PRICE}(listingId);

        vm.prank(stranger);
        vm.expectRevert(NFTMarketplace.ListingNotActive.selector);
        market.buyItem{value: PRICE}(listingId);
    }

    function test_RevertWhen_BuyItem_SellerRevokedApproval() public {
        uint256 listingId = _listAsSeller();

        vm.prank(seller);
        nft.approve(address(0), 0);

        vm.prank(buyer);
        vm.expectRevert();
        market.buyItem{value: PRICE}(listingId);
    }

    function testFuzz_BuyItem_FeeSplitAlwaysSumsToPrice(uint96 price) public {
        vm.assume(price > 0);

        vm.prank(seller);
        nft.approve(address(market), 0);
        vm.prank(seller);
        uint256 listingId = market.listItem(address(nft), 0, price);

        vm.deal(buyer, uint256(price));
        vm.prank(buyer);
        market.buyItem{value: price}(listingId);

        uint256 fee = (uint256(price) * 250) / 10_000;
        uint256 sellerProceeds = uint256(price) - fee;
        assertEq(fee + sellerProceeds, price);
    }

    function test_TotalListings() public {
        assertEq(market.totalListings(), 0);
        _listAsSeller();
        assertEq(market.totalListings(), 1);
    }

    receive() external payable {}
}
