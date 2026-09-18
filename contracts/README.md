# Supra NFT Marketplace contracts

`SupraNFT.sol` (public-mint ERC-721, max supply 10,000) + `NFTMarketplace.sol` (fixed-price
listings for any ERC-721 collection), built with Foundry. See the repo root `README.md` for the
full picture (frontend, deployment flow).

## Layout

- `src/SupraNFT.sol` — ERC-721 + `ERC721Enumerable` + `ERC721URIStorage`, OpenZeppelin v5. Anyone
  can call `mint(string uri)` up to `MAX_SUPPLY`.
- `src/NFTMarketplace.sol` — `listItem` / `buyItem` / `cancelListing`, 2.5% platform fee to the
  contract owner on every sale. Not tied to `SupraNFT` specifically - takes an `nftContract`
  address, so it works with any standard ERC-721.
- `test/` — Foundry tests: unit, revert-path, event, and fuzz coverage for both contracts.
- `script/` — deployment scripts. **Nothing has been deployed** - run these yourself when ready.

## Usage

Foundry must be on your `PATH` (`~/.foundry/bin`).

```shell
forge build              # compile
forge build --sizes      # check contract sizes against the 24KB limit
forge test                # run the test suite
forge test -vvvv          # with full call traces
```

## Deploying (when you're ready — not done by this repo)

Copy `.env.example` to `.env` and fill in `PRIVATE_KEY` plus whichever RPC URL you need.

```shell
# Ethereum Sepolia
forge script script/DeploySepolia.s.sol \
  --rpc-url sepolia --broadcast --private-key $PRIVATE_KEY --verify

# Supra MultiVM EVM Devnet
forge script script/DeploySupraDevnet.s.sol \
  --rpc-url supra_evm_devnet --broadcast --private-key $PRIVATE_KEY
```

Each script deploys both `SupraNFT` and `NFTMarketplace` and logs their addresses. Copy those into
`frontend/.env.local` (see `frontend/.env.local.example`) as `NEXT_PUBLIC_NFT_ADDRESS` and
`NEXT_PUBLIC_MARKETPLACE_ADDRESS`.

After deploying, export fresh ABIs for the frontend:

```shell
./export-abi.sh
```
