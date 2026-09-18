export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
}

/// Rewrites an ipfs:// URI to a public HTTPS gateway URL so it can be fetched/rendered directly
/// in the browser. Leaves http(s) and data URIs untouched.
export function resolveUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

/// Fetches and parses a token's metadata JSON. Returns null on any failure (unreachable URI,
/// invalid JSON, etc.) so callers can fall back to a placeholder instead of crashing the UI.
export async function fetchMetadata(tokenUri: string): Promise<NFTMetadata | null> {
  try {
    const res = await fetch(resolveUri(tokenUri));
    if (!res.ok) return null;
    const json = await res.json();
    return {
      name: typeof json.name === "string" ? json.name : undefined,
      description: typeof json.description === "string" ? json.description : undefined,
      image: typeof json.image === "string" ? resolveUri(json.image) : undefined,
    };
  } catch {
    return null;
  }
}
