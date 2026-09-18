// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NFTMarketplace
/// @notice Fixed-price listing marketplace for any ERC-721 collection. Sellers keep custody of
/// their NFT until it sells; the marketplace only needs approval to move it on a successful buy.
contract NFTMarketplace is Ownable, ReentrancyGuard {
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    /// @dev listingId => Listing. IDs start at 1 so 0 can mean "no listing".
    mapping(uint256 => Listing) public listings;
    uint256 private _nextListingId;

    /// @dev nftContract => tokenId => listingId of the current active listing, or 0 if none.
    mapping(address => mapping(uint256 => uint256)) public activeListingId;

    error InvalidPrice();
    error NotTokenOwner();
    error MarketplaceNotApproved();
    error AlreadyListed();
    error ListingNotActive();
    error NotSeller();
    error InsufficientPayment();
    error TransferFailed();

    event Listed(
        uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price
    );
    event ListingCancelled(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price, uint256 fee);

    constructor() Ownable(msg.sender) {}

    /// @notice Lists an NFT the caller owns for a fixed price. The marketplace must already be
    /// approved to transfer the token (via `approve` or `setApprovalForAll`).
    function listItem(address nftContract, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        if (price == 0) revert InvalidPrice();
        if (activeListingId[nftContract][tokenId] != 0) revert AlreadyListed();

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (nft.getApproved(tokenId) != address(this) && !nft.isApprovedForAll(msg.sender, address(this))) {
            revert MarketplaceNotApproved();
        }

        listingId = ++_nextListingId;
        listings[listingId] =
            Listing({seller: msg.sender, nftContract: nftContract, tokenId: tokenId, price: price, active: true});
        activeListingId[nftContract][tokenId] = listingId;

        emit Listed(listingId, msg.sender, nftContract, tokenId, price);
    }

    /// @notice Cancels an active listing. Only the seller who created it may cancel.
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.active = false;
        activeListingId[listing.nftContract][listing.tokenId] = 0;

        emit ListingCancelled(listingId);
    }

    /// @notice Buys a listed NFT. Transfers the NFT to the buyer and splits payment between the
    /// seller and the platform fee recipient (the contract owner). Any overpayment is refunded.
    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (msg.value < listing.price) revert InsufficientPayment();

        address seller = listing.seller;
        address nftContract = listing.nftContract;
        uint256 tokenId = listing.tokenId;
        uint256 price = listing.price;

        listing.active = false;
        activeListingId[nftContract][tokenId] = 0;

        uint256 fee = (price * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 sellerProceeds = price - fee;

        IERC721(nftContract).safeTransferFrom(seller, msg.sender, tokenId);

        (bool sellerPaid,) = payable(seller).call{value: sellerProceeds}("");
        if (!sellerPaid) revert TransferFailed();

        if (fee > 0) {
            (bool feePaid,) = payable(owner()).call{value: fee}("");
            if (!feePaid) revert TransferFailed();
        }

        if (msg.value > price) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - price}("");
            if (!refunded) revert TransferFailed();
        }

        emit Sold(listingId, msg.sender, seller, price, fee);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /// @notice Total number of listings ever created (active + inactive). Listing IDs run from
    /// 1 to this value inclusive, so the frontend can enumerate them for browsing.
    function totalListings() external view returns (uint256) {
        return _nextListingId;
    }
}
