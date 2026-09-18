# Supra NFT Marketplace

A fixed-price NFT marketplace for Supra's EVM MultiVM chain: an ERC-721 collection with public
minting plus a marketplace contract for listing, buying, and cancelling listings, built with
Foundry, and a Next.js + StarKey frontend to mint, browse, and trade.

**Nothing in this repo has been deployed anywhere.** Contracts are built and tested locally only;
deployment scripts exist under `contracts/script/` for you to run when you're ready.

## Structure

```
supra-nft-marketplace/
├── contracts/     Foundry project - SupraNFT.sol + NFTMarketplace.sol, full test suite
└── frontend/      Next.js 16 + viem + wagmi marketplace UI, StarKey-first wallet connect
```

## Contracts

- **`SupraNFT.sol`** — ERC-721 (with `ERC721Enumerable` + `ERC721URIStorage`). `mint(string uri)`
  is open to anyone, capped at `MAX_SUPPLY = 10,000`.
- **`NFTMarketplace.sol`** — works with any ERC-721 collection, not just `SupraNFT`.
  - `listItem(nftContract, tokenId, price)` — lists a token you own and have approved the
    marketplace to transfer (via `approve` or `setApprovalForAll`). Seller keeps custody until sold.
  - `buyItem(listingId)` — pays the listing price, transfers the NFT to the buyer, and splits
    payment: 2.5% platform fee to the contract owner, the rest to the seller. Overpayment is refunded.
  - `cancelListing(listingId)` — seller-only, reopens the token for a fresh listing.

See `contracts/README.md` for build/test/deploy commands.

## Frontend

Connect wallet (StarKey first, MetaMask fallback), mint an NFT with a metadata URI, view the NFTs
you own, list one for sale (one-time `setApprovalForAll`, then per-token pricing), browse and buy
active listings, and cancel your own listings.

```shell
cd frontend
pnpm install
cp .env.local.example .env.local   # fill in addresses after you deploy
pnpm dev
```

Until `contracts/script/*.s.sol` have been run and the resulting addresses filled into
`frontend/.env.local`, each page shows a placeholder instead of a live UI — this is expected.

## Getting from here to a live deployment

1. `cd contracts && forge test` — confirm everything still passes (33 tests).
2. Run `script/DeploySepolia.s.sol` or `script/DeploySupraDevnet.s.sol` depending on your target
   network — each deploys both `SupraNFT` and `NFTMarketplace`.
3. Copy the deployed addresses into `frontend/.env.local`.
4. `pnpm dev` (or `pnpm build && pnpm start`) and connect StarKey (EVM mode) or MetaMask to mint/trade.
