/**
 * Tests for getEvmBalance and getSolanaBalance.
 *
 * Verified behaviours:
 *  1. Invalid EVM private key  → null (never throws)
 *  2. Invalid Solana key       → null (never throws)
 *  3. All RPC endpoints fail   → null (never throws)
 *  4. Sufficient EVM balance   → { address, balanceEth }
 *  5. Low Solana balance       → { address, balanceSol } (caller decides to warn)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── ethers mock ───────────────────────────────────────────────────────────────
// Hoisted so the factory is available when vi.mock() executes.
const mockGetBalance = vi.fn();
const mockWalletCtor = vi.fn();
const mockProviderCtor = vi.fn();

vi.mock("ethers", () => ({
  ethers: {
    Wallet: class {
      address: string;
      constructor(pk: string) {
        mockWalletCtor(pk);
        if (pk === "INVALID_EVM_KEY") throw new Error("invalid private key");
        this.address = "0xDeAdBeEf";
      }
    },
    JsonRpcProvider: class {
      constructor(url: string) {
        mockProviderCtor(url);
      }
      getBalance = mockGetBalance;
    },
    formatEther: (n: bigint) => String(Number(n) / 1e18),
  },
}));

// ── @solana/web3.js mock ──────────────────────────────────────────────────────
const mockSolGetBalance = vi.fn();

vi.mock("@solana/web3.js", () => ({
  Connection: class {
    constructor() {}
    getBalance = mockSolGetBalance;
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  Keypair: {},
  BpfLoader: {},
  BPF_LOADER_PROGRAM_ID: "",
}));

// ── bs58 mock ─────────────────────────────────────────────────────────────────
vi.mock("bs58", () => ({
  default: {
    decode: (s: string) => {
      if (s === "INVALID_BASE58") throw new Error("bad base58");
      // Return 64 bytes so Keypair.fromSecretKey is happy (mocked below)
      return new Uint8Array(64);
    },
  },
}));

// parseSolanaKeypair uses Keypair.fromSecretKey — we need a shim that returns a
// fake keypair with a toBase58 publicKey.
const fakePublicKey = {
  toBase58: () => "SoLaNaAdDr1111",
};
// Patch the already-mocked @solana/web3.js Keypair after the module mock runs.
const solModule = await import("@solana/web3.js");
(solModule.Keypair as unknown as Record<string, unknown>).fromSecretKey = (
  _bytes: Uint8Array,
) => ({ publicKey: fakePublicKey });

// ── Subject under test ────────────────────────────────────────────────────────
const { getEvmBalance, getSolanaBalance } = await import("./deploy.js");

// ─────────────────────────────────────────────────────────────────────────────

describe("getEvmBalance()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletCtor.mockImplementation(() => {});
    mockGetBalance.mockResolvedValue(BigInt(5e16)); // 0.05 ETH
  });

  it("returns null for an invalid private key without throwing", async () => {
    const result = await getEvmBalance("INVALID_EVM_KEY", "https://rpc.example");
    expect(result).toBeNull();
  });

  it("returns null when every RPC endpoint rejects without throwing", async () => {
    mockGetBalance.mockRejectedValue(new Error("network error"));
    const result = await getEvmBalance(
      "0x" + "a".repeat(64),
      "https://bad-rpc.example",
    );
    expect(result).toBeNull();
  });

  it("returns address and balanceEth on success", async () => {
    mockGetBalance.mockResolvedValue(BigInt(5e16)); // 0.05 ETH in wei
    const result = await getEvmBalance("0x" + "a".repeat(64), "https://rpc.example");
    expect(result).not.toBeNull();
    expect(result!.address).toBe("0xDeAdBeEf");
    expect(result!.balanceEth).toBeCloseTo(0.05, 5);
  });
});

describe("getSolanaBalance()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSolGetBalance.mockResolvedValue(500_000_000); // 0.5 SOL in lamports
  });

  it("returns null for an invalid Solana key (bad base58) without throwing", async () => {
    const result = await getSolanaBalance("INVALID_BASE58", "https://rpc.example");
    expect(result).toBeNull();
  });

  it("returns null for a key that starts with [ but is malformed JSON", async () => {
    const result = await getSolanaBalance("[not valid json", "https://rpc.example");
    expect(result).toBeNull();
  });

  it("returns null when every RPC endpoint rejects without throwing", async () => {
    mockSolGetBalance.mockRejectedValue(new Error("connection refused"));
    // Use valid base58 (mocked above to produce 64 bytes)
    const result = await getSolanaBalance("ValidBase58Key", "https://bad-rpc.example");
    expect(result).toBeNull();
  });

  it("returns address and balanceSol on success", async () => {
    mockSolGetBalance.mockResolvedValue(500_000_000); // 0.5 SOL
    const result = await getSolanaBalance("ValidBase58Key", "https://rpc.example");
    expect(result).not.toBeNull();
    expect(result!.address).toBe("SoLaNaAdDr1111");
    expect(result!.balanceSol).toBeCloseTo(0.5, 5);
  });

  it("returns a low balance value so the caller can warn (non-blocking)", async () => {
    mockSolGetBalance.mockResolvedValue(50_000_000); // 0.05 SOL — below 0.1 threshold
    const result = await getSolanaBalance("ValidBase58Key", "https://rpc.example");
    expect(result).not.toBeNull();
    expect(result!.balanceSol).toBeLessThan(0.1);
  });
});
