import type { Chain } from "viem"
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  mainnet,
  base,
} from "viem/chains"

export interface EvmNetworkConfig {
  label: string
  chain: Chain
  isMainnet: boolean
}

export const EVM_NETWORKS: EvmNetworkConfig[] = [
  { label: "Ethereum Sepolia", chain: sepolia, isMainnet: false },
  { label: "Base Sepolia", chain: baseSepolia, isMainnet: false },
  { label: "Arbitrum Sepolia", chain: arbitrumSepolia, isMainnet: false },
  { label: "Optimism Sepolia", chain: optimismSepolia, isMainnet: false },
  { label: "Polygon Amoy", chain: polygonAmoy, isMainnet: false },
  { label: "Ethereum Mainnet", chain: mainnet, isMainnet: true },
  { label: "Base Mainnet", chain: base, isMainnet: true },
]

export interface SolanaNetworkConfig {
  label: string
  cluster: "devnet" | "testnet" | "mainnet-beta"
  isMainnet: boolean
}

export const SOLANA_NETWORKS: SolanaNetworkConfig[] = [
  { label: "Solana Devnet", cluster: "devnet", isMainnet: false },
  { label: "Solana Testnet", cluster: "testnet", isMainnet: false },
  { label: "Solana Mainnet", cluster: "mainnet-beta", isMainnet: true },
]

export function getEvmNetwork(label: string): EvmNetworkConfig | undefined {
  return EVM_NETWORKS.find((n) => n.label === label)
}

export function getSolanaNetwork(label: string): SolanaNetworkConfig | undefined {
  return SOLANA_NETWORKS.find((n) => n.label === label)
}
