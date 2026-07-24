/**
 * Unit tests for runFaucet() — the /faucet command implementation.
 *
 * Verified behaviours:
 *  1. No wallet key configured → prints error, returns without touching ethers/web3
 *  2. EVM chain: derives address via ethers.Wallet and prints faucet links
 *  3. Solana chain: successful airdrop + confirmation → prints balance
 *  4. Solana chain: rate-limited airdrop error → rate-limit message + faucet.solana.com link
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── ora mock (spinner) ────────────────────────────────────────────────────────
// Must be hoisted before any module that imports ora.
const mockSpinnerStop = vi.fn();
const mockSpinnerFail = vi.fn();
const mockSpinnerSucceed = vi.fn();
const mockSpinnerWarn = vi.fn();
const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  stop: mockSpinnerStop,
  fail: mockSpinnerFail,
  succeed: mockSpinnerSucceed,
  warn: mockSpinnerWarn,
  set text(_: string) {},
};

vi.mock("ora", () => ({
  default: vi.fn(() => mockSpinner),
}));

// ── chalk / ui mock ───────────────────────────────────────────────────────────
// Keep the output readable in tests without ANSI codes.
vi.mock("./ui.js", () => ({
  c: new Proxy(
    {},
    {
      get:
        () =>
        (s: unknown) =>
          String(s),
    },
  ),
  icon: {
    cross: "✗",
    check: "✓",
    forge: "⬡",
    dot: "·",
    solana: "◎",
    info: "ℹ",
  },
  banner: vi.fn(),
  phaseLine: vi.fn(),
  printHelp: vi.fn(),
  scoreBar: vi.fn(),
  header: vi.fn(),
}));

// ── ethers mock ───────────────────────────────────────────────────────────────
const mockEthersGetBalance = vi.fn();
const mockEthersWalletCtor = vi.fn();

vi.mock("ethers", () => ({
  ethers: {
    Wallet: class {
      address: string;
      constructor(pk: string) {
        mockEthersWalletCtor(pk);
        if (pk === "INVALID_EVM_KEY") throw new Error("invalid private key");
        this.address = "0xDeAdBeEf1234";
      }
    },
    JsonRpcProvider: class {
      getBalance = mockEthersGetBalance;
    },
    formatEther: (n: bigint) => String(Number(n) / 1e18),
  },
}));

// ── @solana/web3.js mock ──────────────────────────────────────────────────────
const mockRequestAirdrop = vi.fn();
const mockGetLatestBlockhash = vi.fn();
const mockConfirmTransaction = vi.fn();
const mockSolGetBalance = vi.fn();
const mockGetVersion = vi.fn();

vi.mock("@solana/web3.js", () => ({
  Connection: class {
    constructor() {}
    requestAirdrop = mockRequestAirdrop;
    getLatestBlockhash = mockGetLatestBlockhash;
    confirmTransaction = mockConfirmTransaction;
    getBalance = mockSolGetBalance;
    getVersion = mockGetVersion;
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  Keypair: {
    fromSecretKey: (_bytes: Uint8Array) => ({
      publicKey: { toBase58: () => "SoLaNaWaLLet1111" },
    }),
  },
  BpfLoader: {},
  BPF_LOADER_PROGRAM_ID: "",
}));

// ── bs58 mock ─────────────────────────────────────────────────────────────────
vi.mock("bs58", () => ({
  default: {
    decode: (s: string) => {
      if (s === "INVALID_BASE58") throw new Error("bad base58");
      return new Uint8Array(64);
    },
  },
}));

// ── deploy.js mock (parseSolanaKeypair) ───────────────────────────────────────
vi.mock("./deploy.js", () => ({
  parseSolanaKeypair: async (raw: string) => {
    if (raw === "INVALID_SOL_KEY") throw new Error("Could not parse Solana wallet key.");
    return {
      publicKey: { toBase58: () => "SoLaNaWaLLet1111" },
    };
  },
  resolveWalletKey: (configKey?: string) =>
    process.env.AURA_FORGE_WALLET_KEY ?? configKey,
  deployEvm: vi.fn(),
  deploySolana: vi.fn(),
  getEvmBalance: vi.fn(),
  getSolanaBalance: vi.fn(),
}));

// ── forge.js mock (Chain type referenced at runtime) ─────────────────────────
vi.mock("./forge.js", () => ({
  createForgeJob: vi.fn(),
  streamForgeJob: vi.fn(),
  listProjects: vi.fn(),
  deriveContractName: vi.fn(),
  getProject: vi.fn(),
  recordDeployment: vi.fn(),
}));

// ── Subject under test ────────────────────────────────────────────────────────
const { runFaucet } = await import("./faucet.js");

// ─────────────────────────────────────────────────────────────────────────────

describe("runFaucet()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-arm the spinner mock (clearAllMocks resets mockReturnThis)
    mockSpinner.start.mockReturnThis();

    // Default successful airdrop mocks
    mockGetVersion.mockResolvedValue({ "solana-core": "1.18.0", "feature-set": 1 });
    mockRequestAirdrop.mockResolvedValue("airdrop-sig-abc123");
    mockGetLatestBlockhash.mockResolvedValue({
      blockhash: "blockhash123",
      lastValidBlockHeight: 999,
    });
    mockConfirmTransaction.mockResolvedValue({ value: { err: null } });
    mockSolGetBalance.mockResolvedValue(2_000_000_000); // 2 SOL

    // Default EVM balance mock
    mockEthersGetBalance.mockResolvedValue(BigInt(5e16)); // 0.05 ETH
  });

  // ── 1. No wallet key ────────────────────────────────────────────────────────
  describe("when no wallet key is configured", () => {
    it("prints an error message and returns without calling ethers or web3", async () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet(undefined, "EVM");

      expect(logs.some((l) => l.includes("No wallet key configured"))).toBe(true);
      expect(mockEthersWalletCtor).not.toHaveBeenCalled();
      expect(mockRequestAirdrop).not.toHaveBeenCalled();
    });

    it("works the same way on the SOLANA chain", async () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet(undefined, "SOLANA");

      expect(logs.some((l) => l.includes("No wallet key configured"))).toBe(true);
      expect(mockRequestAirdrop).not.toHaveBeenCalled();
    });
  });

  // ── 2. EVM address derivation ───────────────────────────────────────────────
  describe("EVM chain with a valid private key", () => {
    it("derives the wallet address and prints faucet links", async () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("0x" + "a".repeat(64), "EVM");

      expect(mockEthersWalletCtor).toHaveBeenCalledWith("0x" + "a".repeat(64));
      expect(logs.some((l) => l.includes("0xDeAdBeEf1234"))).toBe(true);
      expect(logs.some((l) => l.includes("sepoliafaucet.com"))).toBe(true);
      expect(logs.some((l) => l.includes("alchemy.com/faucets/ethereum-sepolia"))).toBe(
        true,
      );
    });

    it("spins a spinner while deriving the address", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      await runFaucet("0x" + "a".repeat(64), "EVM");
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it("shows a failure message when the private key is invalid", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      await runFaucet("INVALID_EVM_KEY", "EVM");
      expect(mockSpinnerFail).toHaveBeenCalled();
      const failArg: string = mockSpinnerFail.mock.calls[0][0];
      expect(failArg).toMatch(/Could not derive wallet address/i);
    });
  });

  // ── 2b. EVM balance check timeout ──────────────────────────────────────────
  describe("EVM chain — balance check timeout", () => {
    it("completes and prints faucet links even when getBalance never resolves", async () => {
      // getBalance hangs forever — simulated with a promise that never settles
      mockEthersGetBalance.mockReturnValue(new Promise(() => {}));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      // Advance fake timers past the 5-second timeout so the race resolves
      vi.useFakeTimers();
      const faucetPromise = runFaucet("0x" + "a".repeat(64), "EVM");
      await vi.advanceTimersByTimeAsync(6_000);
      await faucetPromise;
      vi.useRealTimers();

      // Faucet links must still appear
      expect(logs.some((l) => l.includes("sepoliafaucet.com"))).toBe(true);
      // Balance spinner should have been stopped (not succeeded) due to timeout
      expect(mockSpinnerSucceed).not.toHaveBeenCalledWith(
        expect.stringContaining("Current balance"),
      );
      expect(mockSpinnerStop).toHaveBeenCalled();
    });
  });

  // ── 3. Solana airdrop success ───────────────────────────────────────────────
  describe("SOLANA chain — successful airdrop", () => {
    it("calls requestAirdrop and confirmTransaction then shows the balance", async () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(mockRequestAirdrop).toHaveBeenCalledTimes(1);
      expect(mockConfirmTransaction).toHaveBeenCalledTimes(1);
      expect(mockSpinnerSucceed).toHaveBeenCalledWith(expect.stringContaining("Airdrop confirmed"));
      // Balance: 2 SOL shown
      expect(logs.some((l) => l.includes("2.000000"))).toBe(true);
    });

    it("passes the airdrop signature to confirmTransaction", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      await runFaucet("ValidBase58Key", "SOLANA");

      const confirmArg = mockConfirmTransaction.mock.calls[0][0];
      expect(confirmArg).toMatchObject({ signature: "airdrop-sig-abc123" });
    });

    it("includes the explorer link in the output", async () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(
        logs.some(
          (l) =>
            l.includes("explorer.solana.com/tx/airdrop-sig-abc123") &&
            l.includes("cluster=devnet"),
        ),
      ).toBe(true);
    });
  });

  // ── 3b. Solana getBalance timeout ───────────────────────────────────────────
  describe("SOLANA chain — post-airdrop balance check timeout", () => {
    it("completes and prints airdrop details even when getBalance never resolves", async () => {
      // getBalance hangs forever
      mockSolGetBalance.mockReturnValue(new Promise(() => {}));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      vi.useFakeTimers();
      const faucetPromise = runFaucet("ValidBase58Key", "SOLANA");
      await vi.advanceTimersByTimeAsync(6_000);
      await faucetPromise;
      vi.useRealTimers();

      // Airdrop confirmation must still have been shown
      expect(mockSpinnerSucceed).toHaveBeenCalledWith(
        expect.stringContaining("Airdrop confirmed"),
      );
      // Balance spinner should warn (not succeed) because getBalance timed out
      expect(mockSpinnerWarn).toHaveBeenCalledWith(
        expect.stringContaining("Could not fetch updated balance"),
      );
      expect(mockSpinnerSucceed).not.toHaveBeenCalledWith(
        expect.stringContaining("New balance"),
      );
      // Explorer link must still appear
      expect(
        logs.some((l) => l.includes("explorer.solana.com/tx/airdrop-sig-abc123")),
      ).toBe(true);
    });
  });

  // ── 4. Solana pre-flight connectivity check ─────────────────────────────────
  describe("SOLANA chain — Devnet unreachable (pre-flight fails)", () => {
    // ── 4a. Network-level errors → "offline" message ──────────────────────────
    const networkErrors = [
      "Failed to fetch",
      "fetch failed",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ECONNRESET",
      "ETIMEDOUT",
      "network error",
      "getaddrinfo ENOTFOUND api.devnet.solana.com",
    ];

    for (const msg of networkErrors) {
      it(`shows "offline" hint for network-level error: "${msg}"`, async () => {
        mockGetVersion.mockRejectedValue(new Error(msg));

        const logs: string[] = [];
        vi.spyOn(console, "log").mockImplementation((...args) =>
          void logs.push(args.join(" ")),
        );

        await runFaucet("ValidBase58Key", "SOLANA");

        expect(mockSpinnerFail).toHaveBeenCalledWith(
          expect.stringContaining("offline"),
        );
        expect(logs.some((l) => l.includes("check your internet connection"))).toBe(true);
        // Must NOT show the Solana status page for a local network problem
        expect(logs.some((l) => l.includes("status.solana.com"))).toBe(false);
      });
    }

    // ── 4b. Non-network errors → "unhealthy node" message ────────────────────
    it("shows 'Devnet node is unhealthy' and status.solana.com for non-network errors", async () => {
      mockGetVersion.mockRejectedValue(new Error("503 Service Unavailable"));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(mockSpinnerFail).toHaveBeenCalledWith(
        expect.stringContaining("Devnet node is unhealthy"),
      );
      expect(logs.some((l) => l.includes("status.solana.com"))).toBe(true);
      // Must NOT say "check your internet" for a node-side failure
      expect(logs.some((l) => l.includes("check your internet connection"))).toBe(false);
    });

    it("shows the RPC URL in the unhealthy-node message", async () => {
      mockGetVersion.mockRejectedValue(new Error("500 Internal Server Error"));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(logs.some((l) => l.includes("https://api.devnet.solana.com"))).toBe(true);
    });

    // ── 4c. Shared behaviour for all pre-flight failures ─────────────────────
    it("does not call requestAirdrop when the connectivity check fails (network)", async () => {
      mockGetVersion.mockRejectedValue(new Error("ECONNREFUSED"));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await runFaucet("ValidBase58Key", "SOLANA");
      expect(mockRequestAirdrop).not.toHaveBeenCalled();
    });

    it("does not call requestAirdrop when the connectivity check fails (unhealthy node)", async () => {
      mockGetVersion.mockRejectedValue(new Error("503 Service Unavailable"));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await runFaucet("ValidBase58Key", "SOLANA");
      expect(mockRequestAirdrop).not.toHaveBeenCalled();
    });

    // ── 4d. getVersion never resolves → timeout → "Cannot reach Devnet RPC" ──
    it("fails promptly with 'Cannot reach Devnet RPC' when getVersion never resolves", async () => {
      // Simulate a TCP-level hang: the promise never settles
      mockGetVersion.mockReturnValue(new Promise(() => {}));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      vi.useFakeTimers();
      const faucetPromise = runFaucet("ValidBase58Key", "SOLANA");
      // Advance past the 5-second pre-flight timeout
      await vi.advanceTimersByTimeAsync(6_000);
      await faucetPromise;
      vi.useRealTimers();

      // Must fail with the timeout-specific message
      expect(mockSpinnerFail).toHaveBeenCalledWith(
        expect.stringContaining("Cannot reach Devnet RPC"),
      );
      // Must NOT proceed to the airdrop
      expect(mockRequestAirdrop).not.toHaveBeenCalled();
      // Must still provide the manual faucet link
      expect(logs.some((l) => l.includes("faucet.solana.com"))).toBe(true);
    });

    it("includes a link to faucet.solana.com for both failure types", async () => {
      for (const errMsg of ["ECONNREFUSED", "503 Service Unavailable"]) {
        vi.clearAllMocks();
        mockSpinner.start.mockReturnThis();
        mockGetVersion.mockRejectedValue(new Error(errMsg));

        const logs: string[] = [];
        vi.spyOn(console, "log").mockImplementation((...args) =>
          void logs.push(args.join(" ")),
        );

        await runFaucet("ValidBase58Key", "SOLANA");

        expect(logs.some((l) => l.includes("faucet.solana.com"))).toBe(true);
      }
    });

    it("proceeds normally when getVersion succeeds", async () => {
      mockGetVersion.mockResolvedValue({ "solana-core": "1.18.0", "feature-set": 1 });

      vi.spyOn(console, "log").mockImplementation(() => {});

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(mockRequestAirdrop).toHaveBeenCalledTimes(1);
      expect(mockSpinnerSucceed).toHaveBeenCalledWith(
        expect.stringContaining("Airdrop confirmed"),
      );
    });
  });

  // ── 5. Solana on-chain confirmation error ───────────────────────────────────
  describe("SOLANA chain — confirmTransaction resolves with a non-null err", () => {
    it("fails with an error message and does not show 'Airdrop confirmed'", async () => {
      mockConfirmTransaction.mockResolvedValue({
        value: { err: { InstructionError: [0, "Custom"] } },
      });

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      // Spinner must show failure, not success
      expect(mockSpinnerFail).toHaveBeenCalled();
      expect(mockSpinnerSucceed).not.toHaveBeenCalledWith(
        expect.stringContaining("Airdrop confirmed"),
      );
    });

    it("includes the on-chain error detail in the output", async () => {
      mockConfirmTransaction.mockResolvedValue({
        value: { err: { InstructionError: [0, "Custom"] } },
      });

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      // The error detail from confirmResult.value.err should appear somewhere
      const allOutput = [
        ...logs,
        ...mockSpinnerFail.mock.calls.map((c) => c.join(" ")),
      ].join("\n");
      expect(allOutput).toMatch(/On-chain transaction failed|InstructionError/i);
    });
  });

  // ── 6. Solana rate-limit failure ────────────────────────────────────────────
  describe("SOLANA chain — rate-limited airdrop", () => {
    const rateLimitMessages = [
      "HTTP 429: Too Many Requests",
      "airdrop limit exceeded",
      "rate limit reached",
      "request limit hit",
    ];

    for (const msg of rateLimitMessages) {
      it(`detects rate-limit from message: "${msg}"`, async () => {
        mockRequestAirdrop.mockRejectedValue(new Error(msg));

        const logs: string[] = [];
        vi.spyOn(console, "log").mockImplementation((...args) =>
          void logs.push(args.join(" ")),
        );

        await runFaucet("ValidBase58Key", "SOLANA");

        expect(mockSpinnerFail).toHaveBeenCalledWith(
          expect.stringContaining("Airdrop rate-limited"),
        );
        expect(
          logs.some((l) => l.includes("faucet.solana.com")),
        ).toBe(true);
        expect(
          logs.some((l) => l.includes("60 seconds")),
        ).toBe(true);
      });
    }

    it("shows a generic RPC error message for non-rate-limit failures", async () => {
      mockRequestAirdrop.mockRejectedValue(new Error("connection refused"));

      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((...args) =>
        void logs.push(args.join(" ")),
      );

      await runFaucet("ValidBase58Key", "SOLANA");

      expect(mockSpinnerFail).toHaveBeenCalledWith(
        expect.stringContaining("Airdrop failed"),
      );
      expect(logs.some((l) => l.includes("connection refused"))).toBe(true);
      // Should NOT show the rate-limit-specific "60 seconds" hint
      expect(logs.some((l) => l.includes("60 seconds"))).toBe(false);
    });
  });
});
