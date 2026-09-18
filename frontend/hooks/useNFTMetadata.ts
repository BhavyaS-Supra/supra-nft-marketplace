"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchMetadata, type NFTMetadata } from "@/lib/metadata";

/// Fetches off-chain metadata JSON for a list of tokenURIs (one query per URI, cached by
/// react-query so switching pages doesn't re-fetch). Returns a map keyed by tokenURI.
export function useNFTMetadata(tokenURIs: string[]): {
  data: Record<string, NFTMetadata | null>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: tokenURIs
      .filter((uri) => uri.length > 0)
      .map((uri) => ({
        queryKey: ["nft-metadata", uri],
        queryFn: () => fetchMetadata(uri),
        staleTime: Infinity,
      })),
  });

  const data: Record<string, NFTMetadata | null> = {};
  let isLoading = false;
  tokenURIs
    .filter((uri) => uri.length > 0)
    .forEach((uri, i) => {
      data[uri] = results[i]?.data ?? null;
      if (results[i]?.isLoading) isLoading = true;
    });

  return { data, isLoading };
}
