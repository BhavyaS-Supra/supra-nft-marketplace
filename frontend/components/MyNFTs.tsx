"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContractWithGas } from "@/hooks/useWriteContractWithGas";
import { parseEther, formatEther, type Abi } from "viem";
import { useMyNFTs } from "@/hooks/useMyNFTs";
import { useMyListingStatus } from "@/hooks/useMyListingStatus";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { NFTCard } from "@/components/NFTCard";
import { CONTRACTS_CONFIGURED, NFT_ADDRESS, MARKETPLACE_ADDRESS } from "@/lib/contracts";
import nftAbiJson from "@/lib/abi/SupraNFT.json";
import marketplaceAbiJson from "@/lib/abi/NFTMarketplace.json";

const nftAbi = nftAbiJson as Abi;
const marketplaceAbi = marketplaceAbiJson as Abi;

function parseContractError(error: Error): string {
  const msg = error.message ?? String(error);
  if (msg.includes("User rejected")) return "Transaction rejected.";
  if (msg.includes("InvalidPrice")) return "Enter a price greater than 0.";
  if (msg.includes("AlreadyListed")) return "This token is already listed.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

export function MyNFTs() {
  const { address, isConnected } = useAccount();
  const { tokens, isLoading: tokensLoading, refetch: refetchTokens } = useMyNFTs(address);
  const tokenIds = tokens.map((t) => t.tokenId);
  const { statusByTokenId, isLoading: statusLoading, refetch: refetchStatus } = useMyListingStatus(tokenIds);
  const { data: metadata } = useNFTMetadata(tokens.map((t) => t.tokenURI));

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "isApprovedForAll",
    args: address ? [address, MARKETPLACE_ADDRESS] : undefined,
    query: { enabled: !!address && CONTRACTS_CONFIGURED },
  });

  const [prices, setPrices] = useState<Record<string, string>>({});

  const approve = useWriteContractWithGas();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });

  const action = useWriteContractWithGas();
  const actionReceipt = useWaitForTransactionReceipt({ hash: action.data });

  useEffect(() => {
    if (approveReceipt.isSuccess) refetchApproval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt.isSuccess]);

  useEffect(() => {
    if (actionReceipt.isSuccess) {
      refetchTokens();
      refetchStatus();
      action.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionReceipt.isSuccess]);

  function handleApprove() {
    approve.reset();
    approve.mutate({
      address: NFT_ADDRESS,
      abi: nftAbi,
      functionName: "setApprovalForAll",
      args: [MARKETPLACE_ADDRESS, true],
    });
  }

  function handleList(tokenId: bigint) {
    const priceStr = prices[tokenId.toString()];
    if (!priceStr) return;
    let priceWei: bigint;
    try {
      priceWei = parseEther(priceStr);
    } catch {
      return;
    }
    action.reset();
    action.mutate({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: "listItem",
      args: [NFT_ADDRESS, tokenId, priceWei],
    });
  }

  function handleCancel(listingId: bigint) {
    action.reset();
    action.mutate({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: "cancelListing",
      args: [listingId],
    });
  }

  if (!CONTRACTS_CONFIGURED) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500">
        Contracts haven&apos;t been deployed yet. Run the scripts in <code>contracts/script</code>,
        then fill in <code>frontend/.env.local</code> to enable this page.
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500">
        Connect a wallet to view your NFTs.
      </div>
    );
  }

  const isLoading = tokensLoading || statusLoading;

  return (
    <div className="w-full max-w-5xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">My NFTs</h1>
        {!isApproved && (
          <button
            onClick={handleApprove}
            disabled={approve.isPending || approveReceipt.isLoading}
            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors"
          >
            {approve.isPending || approveReceipt.isLoading ? "Approving..." : "Approve Marketplace"}
          </button>
        )}
      </div>

      {isLoading && tokens.length === 0 && <p className="text-sm text-gray-500">Loading your NFTs...</p>}
      {!isLoading && tokens.length === 0 && (
        <p className="text-sm text-gray-500">
          You don&apos;t own any NFTs yet. <a className="underline" href="/mint">Mint one</a> to get started.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tokens.map(({ tokenId, tokenURI }) => {
          const status = statusByTokenId.get(tokenId);
          const isActingOnThis =
            (action.variables?.functionName === "listItem" && action.variables?.args?.[1] === tokenId) ||
            (action.variables?.functionName === "cancelListing" &&
              action.variables?.args?.[0] === status?.listingId);
          const isBusy = (action.isPending || actionReceipt.isLoading) && isActingOnThis;

          return (
            <NFTCard key={tokenId.toString()} tokenId={tokenId} metadata={metadata[tokenURI]}>
              {status ? (
                <>
                  <div className="text-sm font-medium">Listed for {formatEther(status.price)} ETH</div>
                  <button
                    onClick={() => handleCancel(status.listingId)}
                    disabled={isBusy}
                    className="w-full py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors"
                  >
                    {isBusy ? "Cancelling..." : "Cancel Listing"}
                  </button>
                </>
              ) : isApproved ? (
                <div className="flex gap-2">
                  <input
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent px-2 py-1.5 text-sm outline-none"
                    placeholder="Price in ETH"
                    inputMode="decimal"
                    value={prices[tokenId.toString()] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [tokenId.toString()]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleList(tokenId)}
                    disabled={isBusy || !prices[tokenId.toString()]}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
                  >
                    {isBusy ? "Listing..." : "List"}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">Approve the marketplace above to list this NFT.</span>
              )}
            </NFTCard>
          );
        })}
      </div>

      {(approve.error || action.error) && (
        <p className="text-sm text-red-500">{parseContractError((action.error ?? approve.error) as Error)}</p>
      )}
    </div>
  );
}
