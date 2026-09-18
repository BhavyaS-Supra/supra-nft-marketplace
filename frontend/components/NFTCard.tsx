"use client";

import { useState, type ReactNode } from "react";
import type { NFTMetadata } from "@/lib/metadata";

export function NFTCard({
  tokenId,
  metadata,
  metadataLoading,
  children,
}: {
  tokenId: bigint;
  metadata: NFTMetadata | null | undefined;
  metadataLoading?: boolean;
  children?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const title = metadata?.name || `Token #${tokenId.toString()}`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
      <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        {metadataLoading ? (
          <span className="text-xs text-gray-500">Loading...</span>
        ) : metadata?.image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.image}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-xs text-gray-400">No image</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium truncate">{title}</h3>
          <span className="text-xs text-gray-500 shrink-0">#{tokenId.toString()}</span>
        </div>
        {metadata?.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{metadata.description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
