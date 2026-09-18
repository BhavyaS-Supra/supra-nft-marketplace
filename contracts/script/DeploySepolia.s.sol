// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/SupraNFT.sol";
import "../src/NFTMarketplace.sol";

/// @notice Deploys SupraNFT + NFTMarketplace to Ethereum Sepolia testnet.
/// Run with:
///   forge script script/DeploySepolia.s.sol --rpc-url sepolia --broadcast --private-key $PRIVATE_KEY --verify
contract DeploySepoliaScript is Script {
    function run() external returns (SupraNFT nft, NFTMarketplace market) {
        vm.startBroadcast();

        nft = new SupraNFT();
        console.log("[Sepolia] SupraNFT deployed to:", address(nft));

        market = new NFTMarketplace();
        console.log("[Sepolia] NFTMarketplace deployed to:", address(market));

        vm.stopBroadcast();
    }
}
