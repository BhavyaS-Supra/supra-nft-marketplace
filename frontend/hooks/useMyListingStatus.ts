import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { NFT_ADDRESS, MARKETPLACE_ADDRESS } from "@/lib/contracts";
import marketplaceAbiJson from "@/lib/abi/NFTMarketplace.json";

const marketplaceAbi = marketplaceAbiJson as Abi;

export interface ListingStatus {
  listingId: bigint;
  price: bigint;
}

/// For a set of owned tokenIds, looks up whether each currently has an active marketplace
/// listing (and its price). Two rounds of multicall: activeListingId(...) per token, then
/// getListing(...) for whichever came back non-zero.
export function useMyListingStatus(tokenIds: bigint[]) {
  const idLookupContracts = useMemo(
    () =>
      tokenIds.map(
        (tokenId) =>
          ({
            address: MARKETPLACE_ADDRESS,
            abi: marketplaceAbi,
            functionName: "activeListingId",
            args: [NFT_ADDRESS, tokenId],
          }) as const
      ),
    [tokenIds]
  );

  const { data: idResults, isLoading: idsLoading } = useReadContracts({
    contracts: idLookupContracts,
    query: { enabled: tokenIds.length > 0 },
  });

  const listingIdByTokenId = useMemo(() => {
    const map = new Map<bigint, bigint>();
    tokenIds.forEach((tokenId, i) => {
      const listingId = idResults?.[i]?.result as bigint | undefined;
      if (listingId && listingId > 0n) map.set(tokenId, listingId);
    });
    return map;
  }, [tokenIds, idResults]);

  const listedTokenIds = useMemo(() => Array.from(listingIdByTokenId.keys()), [listingIdByTokenId]);

  const listingContracts = useMemo(
    () =>
      listedTokenIds.map(
        (tokenId) =>
          ({
            address: MARKETPLACE_ADDRESS,
            abi: marketplaceAbi,
            functionName: "getListing",
            args: [listingIdByTokenId.get(tokenId)],
          }) as const
      ),
    [listedTokenIds, listingIdByTokenId]
  );

  const { data: listingResults, isLoading: listingsLoading, refetch } = useReadContracts({
    contracts: listingContracts,
    query: { enabled: listedTokenIds.length > 0 },
  });

  const statusByTokenId = useMemo(() => {
    const map = new Map<bigint, ListingStatus>();
    listedTokenIds.forEach((tokenId, i) => {
      // getListing's tuple has named components, so viem/wagmi decodes it as an object keyed
      // by those names (not a positional array).
      const raw = listingResults?.[i]?.result as { price: bigint } | undefined;
      const listingId = listingIdByTokenId.get(tokenId);
      if (raw && listingId) {
        map.set(tokenId, { listingId, price: raw.price });
      }
    });
    return map;
  }, [listedTokenIds, listingResults, listingIdByTokenId]);

  return {
    statusByTokenId,
    isLoading: idsLoading || listingsLoading,
    refetch,
  };
}
