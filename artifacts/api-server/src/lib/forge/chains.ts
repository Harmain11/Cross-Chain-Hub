// Chain ids and a public RPC endpoint for the EVM networks offered in the
// deployment picker (see artifacts/aura-forge/src/lib/networks.ts — labels
// must match exactly).
const EVM_CHAINS: Record<string, { chainId: number; rpcUrl: string }> = {
  "Ethereum Sepolia": { chainId: 11155111, rpcUrl: "https://sepolia.drpc.org" },
  "Base Sepolia": { chainId: 84532, rpcUrl: "https://sepolia.base.org" },
  "Arbitrum Sepolia": { chainId: 421614, rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc" },
  "Optimism Sepolia": { chainId: 11155420, rpcUrl: "https://sepolia.optimism.io" },
  "Polygon Amoy": { chainId: 80002, rpcUrl: "https://rpc-amoy.polygon.technology" },
  "Ethereum Mainnet": { chainId: 1, rpcUrl: "https://eth.drpc.org" },
  "Base Mainnet": { chainId: 8453, rpcUrl: "https://mainnet.base.org" },
};

export function getEvmChainId(networkLabel: string): number | undefined {
  return EVM_CHAINS[networkLabel]?.chainId;
}

export function getEvmRpcUrl(networkLabel: string): string | undefined {
  return EVM_CHAINS[networkLabel]?.rpcUrl;
}
