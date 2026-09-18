import type { Address } from "viem";

export const NFT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_ADDRESS || "0x") as Address;
export const MARKETPLACE_ADDRESS = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x") as Address;

export const CONTRACTS_CONFIGURED = NFT_ADDRESS !== "0x" && MARKETPLACE_ADDRESS !== "0x";

export const PLATFORM_FEE_BPS = 250; // 2.5%, mirrors NFTMarketplace.PLATFORM_FEE_BPS
export const BPS_DENOMINATOR = 10_000;
