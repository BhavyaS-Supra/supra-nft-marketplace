"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContractWithGas } from "@/hooks/useWriteContractWithGas";
import type { Abi } from "viem";
import { CONTRACTS_CONFIGURED, NFT_ADDRESS } from "@/lib/contracts";
import nftAbiJson from "@/lib/abi/SupraNFT.json";

const nftAbi = nftAbiJson as Abi;

function parseContractError(error: Error): string {
  const msg = error.message ?? String(error);
  if (msg.includes("User rejected")) return "Transaction rejected.";
  if (msg.includes("MaxSupplyReached")) return "The collection has reached its max supply.";
  if (msg.includes("EmptyTokenURI")) return "Metadata URI can't be empty.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

export function MintForm() {
  const { address, isConnected } = useAccount();
  const [tokenUri, setTokenUri] = useState("");

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "totalSupply",
    query: { enabled: CONTRACTS_CONFIGURED },
  });
  const maxSupply = 10_000;

  const mint = useWriteContractWithGas();
  const mintReceipt = useWaitForTransactionReceipt({ hash: mint.data });

  useEffect(() => {
    if (mintReceipt.isSuccess) refetchSupply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintReceipt.isSuccess]);

  function handleMint() {
    if (!tokenUri) return;
    mint.reset();
    mint.mutate({
      address: NFT_ADDRESS,
      abi: nftAbi,
      functionName: "mint",
      args: [tokenUri],
    });
  }

  if (!CONTRACTS_CONFIGURED) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500">
        Contracts haven&apos;t been deployed yet. Run the scripts in <code>contracts/script</code>,
        then fill in <code>frontend/.env.local</code> to enable minting.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mint an NFT</h2>
        {totalSupply !== undefined && (
          <span className="text-xs text-gray-500">
            {(totalSupply as bigint).toString()} / {maxSupply.toLocaleString()} minted
          </span>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
        <div className="text-xs text-gray-500 mb-1">Metadata URI</div>
        <input
          className="w-full bg-transparent outline-none text-sm"
          placeholder="ipfs://... or https://... pointing to a metadata JSON file"
          value={tokenUri}
          onChange={(e) => setTokenUri(e.target.value)}
        />
      </div>

      <button
        onClick={handleMint}
        disabled={!isConnected || !tokenUri || mint.isPending || mintReceipt.isLoading}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {!isConnected
          ? "Connect wallet to mint"
          : mint.isPending
          ? "Confirm in wallet..."
          : mintReceipt.isLoading
          ? "Minting..."
          : "Mint"}
      </button>

      {mintReceipt.isSuccess && (
        <div className="text-sm text-green-600">
          Minted! View it on <a className="underline" href="/my-nfts">My NFTs</a>.
        </div>
      )}
      {mint.error && <div className="text-sm text-red-500">{parseContractError(mint.error)}</div>}
      {!address && <p className="text-xs text-gray-500">Anyone can mint - connect a wallet to get started.</p>}
    </div>
  );
}
