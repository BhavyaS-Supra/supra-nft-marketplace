"use client";

import { useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContractWithGas } from "@/hooks/useWriteContractWithGas";
import { formatEther, type Abi } from "viem";
import { useMarketplaceListings } from "@/hooks/useMarketplaceListings";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { NFTCard } from "@/components/NFTCard";
import { CONTRACTS_CONFIGURED, MARKETPLACE_ADDRESS } from "@/lib/contracts";
import marketplaceAbiJson from "@/lib/abi/NFTMarketplace.json";

const marketplaceAbi = marketplaceAbiJson as Abi;

function parseContractError(error: Error): string {
  const msg = error.message ?? String(error);
  if (msg.includes("User rejected")) return "Transaction rejected.";
  if (msg.includes("ListingNotActive")) return "This listing is no longer available.";
  if (msg.includes("InsufficientPayment")) return "Insufficient payment.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

export function Marketplace() {
  const { address } = useAccount();
  const { listings, isLoading, refetch } = useMarketplaceListings();
  const { data: metadata } = useNFTMetadata(listings.map((l) => l.tokenURI));

  const buy = useWriteContractWithGas();
  const buyReceipt = useWaitForTransactionReceipt({ hash: buy.data });

  useEffect(() => {
    if (buyReceipt.isSuccess) {
      refetch();
      buy.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyReceipt.isSuccess]);

  function handleBuy(listingId: bigint, price: bigint) {
    buy.reset();
    buy.mutate({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: "buyItem",
      args: [listingId],
      value: price,
    });
  }

  if (!CONTRACTS_CONFIGURED) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500">
        Contracts haven&apos;t been deployed yet. Run the scripts in <code>contracts/script</code>,
        then fill in <code>frontend/.env.local</code> (NFT + marketplace addresses) to enable
        the marketplace.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Marketplace</h1>

      {isLoading && listings.length === 0 && (
        <p className="text-sm text-gray-500">Loading listings...</p>
      )}
      {!isLoading && listings.length === 0 && (
        <p className="text-sm text-gray-500">No active listings yet. Mint an NFT and list it for sale!</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((listing) => {
          const isOwnListing = address && listing.seller.toLowerCase() === address.toLowerCase();
          const isBuyingThis = buy.variables?.args?.[0] === listing.listingId;

          return (
            <NFTCard
              key={listing.listingId.toString()}
              tokenId={listing.tokenId}
              metadata={metadata[listing.tokenURI]}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{formatEther(listing.price)} ETH</span>
                <span className="text-xs text-gray-500 font-mono">
                  {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </span>
              </div>
              {isOwnListing ? (
                <span className="w-full py-2 rounded-lg text-center text-xs text-gray-500 border border-gray-200 dark:border-gray-800">
                  Your listing
                </span>
              ) : (
                <button
                  onClick={() => handleBuy(listing.listingId, listing.price)}
                  disabled={!address || (buy.isPending && isBuyingThis) || (buyReceipt.isLoading && isBuyingThis)}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {!address
                    ? "Connect wallet"
                    : buy.isPending && isBuyingThis
                    ? "Confirm in wallet..."
                    : buyReceipt.isLoading && isBuyingThis
                    ? "Buying..."
                    : "Buy"}
                </button>
              )}
            </NFTCard>
          );
        })}
      </div>

      {buy.error && <p className="text-sm text-red-500">{parseContractError(buy.error)}</p>}
    </div>
  );
}
