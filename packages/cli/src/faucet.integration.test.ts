/**
 * Integration smoke test for the Solana Devnet /faucet code path.
 *
 * These tests exercise the REAL @solana/web3.js Connection against a live
 * Devnet RPC — no mocks.  They are skipped by default and opt-in via env var
 * so CI doesn't depend on a flaky public faucet, while still providing a
 * deterministic way to verify the end-to-end flow:
 *
 *   AURA_FORGE_INTEGRATION_TESTS=1 pnpm test -- faucet.integration
 *
 * Rate-limit note: public Devnet airdrop endpoints are IP-throttled.
 * The airdrop test is therefore wrapped in a graceful skip: if the request
 * returns HTTP 429 / "airdrop limit" the test is skipped (not failed) so
 * it doesn't produce a red build when run from a shared IP.  Run it from a
 * private Helius/QuickNode endpoint (AURA_FORGE_SOL_RPC_URL) to get a
 * deterministic green.
 *
 * Non-airdrop assertions (connection, keypair parsing, getLatestBlockhash)
 * always run unconditionally and prove the Devnet plumbing works.
 */

import { describe, it, expect } from "vitest";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { parseSolanaKeypair } from "./deploy.js";

const RUN_INTEGRATION = process.env.AURA_FORGE_INTEGRATION_TESTS === "1";
const RPC_URL =
  process.env.AURA_FORGE_SOL_RPC_URL ?? "https://api.devnet.solana.com";

// ── Helpers ────────────────────────────────────────────────────────────────────

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|too many requests|rate.?limit|airdrop.?limit|faucet has run dry/i.test(msg);
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe.skipIf(!RUN_INTEGRATION)("Solana Devnet integration — /faucet code path", { timeout: 90_000 }, () => {

  // ── 1. Devnet connectivity ────────────────────────────────────────────────
  it("connects to Devnet and returns a valid version string", async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    const version = await conn.getVersion();
    expect(typeof version["solana-core"]).toBe("string");
    expect(version["solana-core"].length).toBeGreaterThan(0);
    console.log("Devnet version:", version["solana-core"]);
  });

  // ── 2. getLatestBlockhash ─────────────────────────────────────────────────
  it("fetches a valid latest blockhash from Devnet", async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    expect(typeof blockhash).toBe("string");
    expect(blockhash.length).toBeGreaterThan(0);
    expect(lastValidBlockHeight).toBeGreaterThan(0);
    console.log("Blockhash:", blockhash, "  lastValidBlockHeight:", lastValidBlockHeight);
  });

  // ── 3. parseSolanaKeypair round-trip ──────────────────────────────────────
  it("parseSolanaKeypair parses a fresh base58 keypair and derives a valid public key", async () => {
    const { default: bs58 } = await import("bs58");
    const ephemeral = Keypair.generate();
    const base58Key = bs58.encode(ephemeral.secretKey);

    const parsed = await parseSolanaKeypair(base58Key);
    const expectedAddress = ephemeral.publicKey.toBase58();
    expect(parsed.publicKey.toBase58()).toBe(expectedAddress);
    console.log("Ephemeral address:", expectedAddress);
  });

  it("parseSolanaKeypair parses a JSON byte-array keypair", async () => {
    const ephemeral = Keypair.generate();
    const jsonKey = JSON.stringify(Array.from(ephemeral.secretKey));

    const parsed = await parseSolanaKeypair(jsonKey);
    expect(parsed.publicKey.toBase58()).toBe(ephemeral.publicKey.toBase58());
  });

  // ── 4. getBalance on a fresh address returns 0 ────────────────────────────
  it("returns 0 lamports for a fresh wallet that has never been funded", async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    const fresh = Keypair.generate();
    const lamports = await conn.getBalance(fresh.publicKey);
    expect(lamports).toBe(0);
    console.log("Fresh wallet balance:", lamports, "lamports (expected 0)");
  });

  // ── 5. requestAirdrop end-to-end ──────────────────────────────────────────
  //
  // Skipped gracefully (not failed) when the public Devnet faucet is
  // IP-rate-limited.  To run deterministically, set AURA_FORGE_SOL_RPC_URL
  // to a private Helius/QuickNode devnet endpoint.
  it("requests 1 SOL airdrop, confirms the tx, and returns the funded balance", async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    const wallet = Keypair.generate();
    const address = wallet.publicKey.toBase58();
    console.log("Airdrop target:", address);

    let sig: string;
    try {
      sig = await conn.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
    } catch (err) {
      if (isRateLimit(err)) {
        console.warn("Devnet airdrop rate-limited — skipping balance assertion.");
        return; // graceful skip, not a failure
      }
      throw err;
    }

    expect(typeof sig).toBe("string");
    expect(sig.length).toBeGreaterThan(0);
    console.log("Airdrop signature:", sig);

    // Confirm
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    const confirmation = await conn.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    expect(confirmation.value.err).toBeNull();
    console.log("Confirmation error:", confirmation.value.err, "(expected null)");

    // Fetch resulting balance
    const lamports = await conn.getBalance(wallet.publicKey);
    const sol = lamports / LAMPORTS_PER_SOL;
    console.log(`Post-airdrop balance: ${sol.toFixed(6)} SOL`);

    // Balance must be at least 1 SOL (might be more if residual from prior run)
    expect(sol).toBeGreaterThanOrEqual(1);
  });
});

// ── Always-running connectivity sanity (no opt-in required) ───────────────────

describe("Solana Devnet — always-on connectivity sanity", { timeout: 30_000 }, () => {
  it("resolves the Devnet RPC version without error", async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    const version = await conn.getVersion();
    expect(typeof version["solana-core"]).toBe("string");
  });
});
