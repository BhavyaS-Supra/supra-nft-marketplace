import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import type { Abi, Address } from "viem";
import { NFT_ADDRESS } from "@/lib/contracts";
import nftAbiJson from "@/lib/abi/SupraNFT.json";

const nftAbi = nftAbiJson as Abi;

export interface OwnedToken {
  tokenId: bigint;
  tokenURI: string;
}

/// Enumerates every token the given address owns in the SupraNFT collection via
/// ERC721Enumerable's tokenOfOwnerByIndex, then reads each token's metadata URI.
export function useMyNFTs(owner: Address | undefined) {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  const count = Number(balance ?? 0n);

  const indexContracts = useMemo(
    () =>
      Array.from(
        { length: count },
        (_, i) =>
          ({
            address: NFT_ADDRESS,
            abi: nftAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [owner, BigInt(i)],
          }) as const
      ),
    [count, owner]
  );

  const { data: tokenIdResults, isLoading: idsLoading } = useReadContracts({
    contracts: indexContracts,
    query: { enabled: !!owner && count > 0 },
  });

  const tokenIds = useMemo(
    () => (tokenIdResults ?? []).map((r) => r.result as bigint | undefined).filter((id): id is bigint => id !== undefined),
    [tokenIdResults]
  );

  const uriContracts = useMemo(
    () =>
      tokenIds.map(
        (tokenId) =>
          ({
            address: NFT_ADDRESS,
            abi: nftAbi,
            functionName: "tokenURI",
            args: [tokenId],
          }) as const
      ),
    [tokenIds]
  );

  const { data: uriResults, isLoading: urisLoading, refetch } = useReadContracts({
    contracts: uriContracts,
    query: { enabled: tokenIds.length > 0 },
  });

  const tokens: OwnedToken[] = useMemo(
    () =>
      tokenIds.map((tokenId, i) => ({
        tokenId,
        tokenURI: (uriResults?.[i]?.result as string | undefined) ?? "",
      })),
    [tokenIds, uriResults]
  );

  return {
    tokens,
    isLoading: balanceLoading || idsLoading || urisLoading,
    refetch,
  };
}
