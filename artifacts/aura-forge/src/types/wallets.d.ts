// Ambient type declarations for browser wallet providers injected by
// extensions (MetaMask for EVM, Phantom for Solana). These are intentionally
// minimal — just enough surface area for the wallet-connect deploy flow.

interface EthereumProvider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

interface PhantomSolanaProvider {
  isPhantom?: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: import("@solana/web3.js").PublicKey }>
  disconnect?: () => Promise<void>
  signTransaction: <T>(transaction: T) => Promise<T>
  signAllTransactions?: <T>(transactions: T[]) => Promise<T[]>
}

interface Window {
  ethereum?: EthereumProvider
  solana?: PhantomSolanaProvider
}
