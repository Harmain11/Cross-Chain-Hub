/**
 * Testnet deployment helpers for the AURA Forge CLI.
 *
 * EVM  → Sepolia   (ethers.js)
 * SOL  → Devnet    (@solana/web3.js BpfLoader)
 *
 * Wallet key resolution order:
 *   1. AURA_FORGE_WALLET_KEY env var
 *   2. walletPrivateKey field in ~/.aura-forge/config.json
 */

import type { FullForgeProject } from "./forge.js";

// ─── Retry helper ─────────────────────────────────────────────────────────────

/** Returns true when the error looks like an HTTP 429 / rate-limit response. */
function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || /too many requests/i.test(msg) || /rate.?limit/i.test(msg);
}

/**
 * Returns true for errors that should never trigger a retry because they
 * indicate a definitive misconfiguration or on-chain rejection, not a
 * transient RPC hiccup (e.g. bad private key, insufficient funds, invalid
 * API key).
 */
function isFatalError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /insufficient.?funds/i.test(msg) ||
    /invalid.?(private.?key|secret.?key|wallet.?key|key)/i.test(msg) ||
    /bad.?key/i.test(msg) ||
    /\bunauthorized\b/i.test(msg) ||
    /invalid.?api.?key/i.test(msg)
  );
}

/**
 * Attempt `fn` up to `maxAttempts` times, retrying only when the error looks
 * like a transient rate-limit (429 / Too Many Requests).  Fatal errors (bad
 * key, insufficient funds, …) propagate immediately without retrying.
 *
 * Default back-off schedule: 500 ms → 1 000 ms (exponential ×2, 3 attempts).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 500,
  }: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      // Fatal errors or non-rate-limit errors: propagate immediately.
      if (isFatalError(err) || !isRateLimitError(err) || attempt >= maxAttempts) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.error(
        `  Rate-limited — retrying in ${delay} ms (attempt ${attempt}/${maxAttempts})…`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export type DeployResult = {
  txHash: string;
  contractAddress: string;
  networkLabel: string;
  explorerUrl: string;
};

// ─── EVM / Sepolia ────────────────────────────────────────────────────────────

/**
 * Public Sepolia RPC endpoints tried in order.
 * Set AURA_FORGE_EVM_RPC_URL to skip the fallback list entirely.
 */
const EVM_RPC_FALLBACKS = [
  "https://rpc2.sepolia.org",
  "https://sepolia.drpc.org",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
];

const DEFAULT_EVM_RPC = process.env.AURA_FORGE_EVM_RPC_URL ?? null;

export async function deployEvm(
  project: FullForgeProject,
  privateKey: string,
  rpcUrl?: string,
): Promise<DeployResult> {
  if (!project.compiledBytecode) {
    throw new Error(
      "No compiled bytecode available for this project.\n" +
        "  Re-forge or recompile the contract so the server stores its bytecode.",
    );
  }

  // Dynamic import keeps ethers out of the module graph until needed.
  const { ethers } = await import("ethers");

  // Capture bytecode as a local so the closure sees a narrowed string type.
  const bytecode = project.compiledBytecode;

  let abi: unknown[] = [];
  if (project.abiOrIdl) {
    try {
      abi = JSON.parse(project.abiOrIdl);
    } catch {
      throw new Error("Failed to parse ABI stored in project.");
    }
  }

  /** Deploy against a single Sepolia RPC URL, with rate-limit retries. */
  const tryEvmUrl = (url: string) =>
    withRetry(async () => {
      const provider = new ethers.JsonRpcProvider(url);
      const wallet = new ethers.Wallet(privateKey, provider);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const factory = new ethers.ContractFactory(abi as any, bytecode, wallet);
      const contract = await factory.deploy();
      const receipt = await contract.deploymentTransaction()!.wait(1);
      const contractAddress = await contract.getAddress();
      const txHash = receipt?.hash ?? contract.deploymentTransaction()!.hash;
      return {
        txHash,
        contractAddress,
        networkLabel: "sepolia",
        explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
      };
    });

  // If the caller or env var provides a specific URL, use it directly.
  if (rpcUrl ?? DEFAULT_EVM_RPC) {
    return tryEvmUrl((rpcUrl ?? DEFAULT_EVM_RPC)!);
  }

  // Try each public fallback in order.
  const errors: string[] = [];
  for (const url of EVM_RPC_FALLBACKS) {
    try {
      console.error(`  Trying Sepolia RPC: ${url}`);
      return await tryEvmUrl(url);
    } catch (err) {
      if (isFatalError(err)) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${url}: ${msg}`);
      console.error(`  Sepolia RPC failed (${url}): ${msg}`);
    }
  }

  throw new Error(
    "All public Sepolia RPC endpoints failed:\n" +
      errors.map((e) => `  • ${e}`).join("\n") +
      "\n\nFix: set AURA_FORGE_EVM_RPC_URL to a private Infura or Alchemy endpoint:\n" +
      "  export AURA_FORGE_EVM_RPC_URL=https://sepolia.infura.io/v3/<YOUR_KEY>",
  );
}

// ─── Solana / Devnet ──────────────────────────────────────────────────────────

/**
 * Public Solana devnet RPC endpoints tried in order.
 * Set AURA_FORGE_SOL_RPC_URL to skip the fallback list entirely.
 */
const SOL_RPC_FALLBACKS = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com/?api-key=public",
  "https://solana-devnet-rpc.publicnode.com",
];

const DEFAULT_SOL_RPC = process.env.AURA_FORGE_SOL_RPC_URL ?? null;

/**
 * Parse a Solana wallet key.
 *
 * Accepts:
 *   - JSON array of bytes (from `solana-keygen new --outfile key.json`)
 *   - base58-encoded secret key (64 bytes)
 *
 * Exported so other modules (e.g. the CLI REPL /faucet command) can derive
 * a public key without duplicating the parsing logic.
 */
export async function parseSolanaKeypair(raw: string) {
  const { Keypair } = await import("@solana/web3.js");

  // Try JSON array first
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(new Uint8Array(arr));
    } catch {
      throw new Error("Wallet key looks like a JSON array but could not be parsed.");
    }
  }

  // Fall back to base58 — use Buffer to decode
  // Solana base58 keys are 88 characters representing 64 bytes.
  try {
    const { default: bs58 } = await import("bs58");
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    throw new Error(
      "Could not parse Solana wallet key.\n" +
        "  Provide a JSON byte-array (from solana-keygen) or a base58-encoded secret key.",
    );
  }
}

async function deploySolanaWithRpc(
  project: FullForgeProject,
  walletKey: string,
  rpcUrl: string,
): Promise<DeployResult> {
  const { Connection, Keypair, BpfLoader, BPF_LOADER_PROGRAM_ID } =
    await import("@solana/web3.js");

  const connection = new Connection(rpcUrl, "confirmed");
  const payerKeypair = await parseSolanaKeypair(walletKey);
  const programKeypair = Keypair.generate();

  // compiledBytecode is stored as base64-encoded .so bytes on the server.
  const programBytes = Buffer.from(project.compiledBytecode!, "base64");

  // Wrap the BPF load in withRetry so transient 429s are retried on the same
  // endpoint before falling through to the next one in deploySolana.
  const ok = await withRetry(() =>
    BpfLoader.load(
      connection,
      payerKeypair,
      programKeypair,
      programBytes,
      BPF_LOADER_PROGRAM_ID,
    ),
  );

  if (!ok) throw new Error("BPF program deployment failed — check your devnet balance.");

  const programId = programKeypair.publicKey.toBase58();

  // Retrieve the deployment transaction signature for the record.
  const sigs = await connection.getSignaturesForAddress(programKeypair.publicKey, { limit: 1 });
  const txHash = sigs[0]?.signature ?? programId;

  return {
    txHash,
    contractAddress: programId,
    networkLabel: "devnet",
    explorerUrl: `https://explorer.solana.com/address/${programId}?cluster=devnet`,
  };
}

export async function deploySolana(
  project: FullForgeProject,
  walletKey: string,
  rpcUrl?: string,
): Promise<DeployResult> {
  if (!project.compiledBytecode) {
    throw new Error(
      "No compiled program binary available for this project.\n" +
        "  Re-forge the contract so the server stores its compiled .so bytes.",
    );
  }

  // If the caller or env var provides a specific URL, use it directly.
  if (rpcUrl ?? DEFAULT_SOL_RPC) {
    return deploySolanaWithRpc(project, walletKey, (rpcUrl ?? DEFAULT_SOL_RPC)!);
  }

  // Try each public fallback in order.  deploySolanaWithRpc already applies
  // withRetry internally for 429s, so errors here are post-retry failures.
  const errors: string[] = [];
  for (const url of SOL_RPC_FALLBACKS) {
    try {
      console.error(`  Trying Solana devnet RPC: ${url}`);
      return await deploySolanaWithRpc(project, walletKey, url);
    } catch (err) {
      if (isFatalError(err)) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${url}: ${msg}`);
      console.error(`  Solana devnet RPC failed (${url}): ${msg}`);
    }
  }

  throw new Error(
    "All public Solana devnet RPC endpoints failed:\n" +
      errors.map((e) => `  • ${e}`).join("\n") +
      "\n\nFix: set AURA_FORGE_SOL_RPC_URL to a private Helius or QuickNode devnet endpoint:\n" +
      "  export AURA_FORGE_SOL_RPC_URL=https://devnet.helius-rpc.com/?api-key=<YOUR_KEY>",
  );
}

// ─── Wallet key resolution ────────────────────────────────────────────────────

export function resolveWalletKey(configKey?: string): string | undefined {
  return process.env.AURA_FORGE_WALLET_KEY ?? configKey;
}

// ─── Balance helpers ──────────────────────────────────────────────────────────

export type EvmBalanceResult = {
  address: string;
  balanceEth: number;
};

/**
 * Fetch the Sepolia ETH balance for the given private key.
 * Tries the env-var RPC first, then the public fallback list.
 * Never throws — returns null if all RPCs fail.
 */
export async function getEvmBalance(
  privateKey: string,
  rpcUrl?: string,
): Promise<EvmBalanceResult | null> {
  try {
    const { ethers } = await import("ethers");

    let address: string;
    try {
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
    } catch {
      // Invalid key format — cannot derive address, skip balance check
      return null;
    }

    const urls = rpcUrl
      ? [rpcUrl]
      : DEFAULT_EVM_RPC
      ? [DEFAULT_EVM_RPC, ...EVM_RPC_FALLBACKS]
      : EVM_RPC_FALLBACKS;

    for (const url of urls) {
      try {
        return await withRetry(async () => {
          const provider = new ethers.JsonRpcProvider(url);
          const bal = await provider.getBalance(address);
          const balanceEth = parseFloat(ethers.formatEther(bal));
          return { address, balanceEth };
        });
      } catch {
        // try next
      }
    }

    return null;
  } catch {
    return null;
  }
}

export type SolanaBalanceResult = {
  address: string;
  balanceSol: number;
};

/**
 * Fetch the Devnet SOL balance for the given wallet key.
 * Tries the env-var RPC first, then the public fallback list.
 * Never throws — returns null if all RPCs fail.
 */
export async function getSolanaBalance(
  walletKey: string,
  rpcUrl?: string,
): Promise<SolanaBalanceResult | null> {
  try {
    const { Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

    let address: string;
    let publicKey: Awaited<ReturnType<typeof parseSolanaKeypair>>["publicKey"];
    try {
      const keypair = await parseSolanaKeypair(walletKey);
      address = keypair.publicKey.toBase58();
      publicKey = keypair.publicKey;
    } catch {
      // Invalid key format — cannot derive address, skip balance check
      return null;
    }

    const urls = rpcUrl
      ? [rpcUrl]
      : DEFAULT_SOL_RPC
      ? [DEFAULT_SOL_RPC, ...SOL_RPC_FALLBACKS]
      : SOL_RPC_FALLBACKS;

    for (const url of urls) {
      try {
        return await withRetry(async () => {
          const connection = new Connection(url, "confirmed");
          const lamports = await connection.getBalance(publicKey);
          const balanceSol = lamports / LAMPORTS_PER_SOL;
          return { address, balanceSol };
        });
      } catch {
        // try next
      }
    }

    return null;
  } catch {
    return null;
  }
}
