#!/usr/bin/env bash
# Exports ABIs for the frontend after `forge build`. Run from the contracts/ directory.
set -euo pipefail

OUT_DIR="../frontend/lib/abi"
mkdir -p "$OUT_DIR"

forge inspect src/SupraNFT.sol:SupraNFT abi --json > "$OUT_DIR/SupraNFT.json"
forge inspect src/NFTMarketplace.sol:NFTMarketplace abi --json > "$OUT_DIR/NFTMarketplace.json"

echo "ABIs exported to $OUT_DIR"
