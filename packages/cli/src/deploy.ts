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

export type DeployResult = {
  txHash: string;
  contractAddress: string;
  networkLabel: string;
  explorerUrl: string;
};

// ─── EVM / Sepolia ────────────────────────────────────────────────────────────

const DEFAULT_EVM_RPC =
  process.env.AURA_FORGE_EVM_RPC_URL ?? "https://rpc2.sepolia.org";

export async function deployEvm(
  project: FullForgeProject,
  privateKey: string,
  rpcUrl = DEFAULT_EVM_RPC,
): Promise<DeployResult> {
  if (!project.compiledBytecode) {
    throw new Error(
      "No compiled bytecode available for this project.\n" +
        "  Re-forge or recompile the contract so the server stores its bytecode.",
    );
  }

  // Dynamic import keeps ethers out of the module graph until needed.
  const { ethers } = await import("ethers");

  let abi: unknown[] = [];
  if (project.abiOrIdl) {
    try {
      abi = JSON.parse(project.abiOrIdl);
    } catch {
      throw new Error("Failed to parse ABI stored in project.");
    }
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factory = new ethers.ContractFactory(abi as any, project.compiledBytecode, wallet);
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
}

// ─── Solana / Devnet ──────────────────────────────────────────────────────────

const DEFAULT_SOL_RPC =
  process.env.AURA_FORGE_SOL_RPC_URL ?? "https://api.devnet.solana.com";

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

export async function deploySolana(
  project: FullForgeProject,
  walletKey: string,
  rpcUrl = DEFAULT_SOL_RPC,
): Promise<DeployResult> {
  if (!project.compiledBytecode) {
    throw new Error(
      "No compiled program binary available for this project.\n" +
        "  Re-forge the contract so the server stores its compiled .so bytes.",
    );
  }

  const { Connection, Keypair, BpfLoader, BPF_LOADER_PROGRAM_ID } =
    await import("@solana/web3.js");

  const connection = new Connection(rpcUrl, "confirmed");
  const payerKeypair = await parseSolanaKeypair(walletKey);
  const programKeypair = Keypair.generate();

  // compiledBytecode is stored as base64-encoded .so bytes on the server.
  const programBytes = Buffer.from(project.compiledBytecode, "base64");

  const ok = await BpfLoader.load(
    connection,
    payerKeypair,
    programKeypair,
    programBytes,
    BPF_LOADER_PROGRAM_ID,
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

// ─── Wallet key resolution ────────────────────────────────────────────────────

export function resolveWalletKey(configKey?: string): string | undefined {
  return process.env.AURA_FORGE_WALLET_KEY ?? configKey;
}
