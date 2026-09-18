import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi, Address } from "viem";
import { MARKETPLACE_ADDRESS } from "@/lib/contracts";
import marketplaceAbiJson from "@/lib/abi/NFTMarketplace.json";
import nftAbiJson from "@/lib/abi/SupraNFT.json";

const marketplaceAbi = marketplaceAbiJson as Abi;
const nftAbi = nftAbiJson as Abi;

export interface Listing {
  listingId: bigint;
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  active: boolean;
  tokenURI: string;
}

// getListing's tuple has named components, so viem/wagmi decodes it as an object keyed by those
// names (not a positional array) - this must match NFTMarketplace.Listing's field order/names.
interface RawListing {
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  active: boolean;
}

/// Enumerates every listing ever created (1..totalListings) and reads each one's current state,
/// then resolves each active listing's token metadata URI. There's no on-chain index of "active
/// listings only", so the frontend fetches everything and filters client-side - fine at demo scale.
export function useMarketplaceListings() {
  const { data: totalListings, isLoading: totalLoading } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: marketplaceAbi,
    functionName: "totalListings",
  });

  const total = Number(totalListings ?? 0n);

  const listingContracts = useMemo(
    () =>
      Array.from(
        { length: total },
        (_, i) =>
          ({
            address: MARKETPLACE_ADDRESS,
            abi: marketplaceAbi,
            functionName: "getListing",
            args: [BigInt(i + 1)],
          }) as const
      ),
    [total]
  );

  const { data: listingResults, isLoading: listingsLoading } = useReadContracts({
    contracts: listingContracts,
    query: { enabled: total > 0 },
  });

  const activeListings = useMemo(() => {
    if (!listingResults) return [];
    return listingResults
      .map((r, i) => {
        const raw = r.result as RawListing | undefined;
        if (!raw || !raw.active) return null;
        const { seller, nftContract, tokenId, price, active } = raw;
        return { listingId: BigInt(i + 1), seller, nftContract, tokenId, price, active };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [listingResults]);

  const uriContracts = useMemo(
    () =>
      activeListings.map(
        (l) =>
          ({
            address: l.nftContract,
            abi: nftAbi,
            functionName: "tokenURI",
            args: [l.tokenId],
          }) as const
      ),
    [activeListings]
  );

  const { data: uriResults, isLoading: urisLoading, refetch } = useReadContracts({
    contracts: uriContracts,
    query: { enabled: activeListings.length > 0 },
  });

  const listings: Listing[] = useMemo(
    () =>
      activeListings.map((l, i) => ({
        ...l,
        tokenURI: (uriResults?.[i]?.result as string | undefined) ?? "",
      })),
    [activeListings, uriResults]
  );

  return {
    listings,
    isLoading: totalLoading || listingsLoading || urisLoading,
    refetch,
  };
}
