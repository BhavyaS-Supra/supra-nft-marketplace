// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/SupraNFT.sol";
import "../src/NFTMarketplace.sol";

/// @notice Deploys SupraNFT + NFTMarketplace to Supra's MultiVM EVM devnet.
/// Run with:
///   forge script script/DeploySupraDevnet.s.sol --rpc-url supra_evm_devnet --broadcast --private-key $PRIVATE_KEY
contract DeploySupraDevnetScript is Script {
    function run() external returns (SupraNFT nft, NFTMarketplace market) {
        vm.startBroadcast();

        nft = new SupraNFT();
        console.log("[Supra EVM Devnet] SupraNFT deployed to:", address(nft));

        market = new NFTMarketplace();
        console.log("[Supra EVM Devnet] NFTMarketplace deployed to:", address(market));

        vm.stopBroadcast();
    }
}
