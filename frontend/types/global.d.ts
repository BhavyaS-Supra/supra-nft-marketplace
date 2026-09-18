import type { EIP1193Provider } from "viem";

export {};

declare global {
  interface Window {
    starkey?: {
      ethereum?: EIP1193Provider;
      supra?: unknown;
    };
  }
}
