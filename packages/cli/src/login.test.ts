/**
 * Integration tests for runSignup() error paths.
 *
 * Three paths are verified:
 *  1. Mismatched passwords → clear message, no network call made
 *  2. Duplicate email (409) → server error surfaced + "aura-forge login" hint
 *  3. API server unreachable → readable message, not a raw exception stack
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Shared readline state ─────────────────────────────────────────────────────
// Each readline.createInterface() call advances the SAME index so that:
//   interface-1 (email)    → responses[0]
//   interface-2 (password) → responses[1]
//   interface-3 (confirm)  → responses[2]
let _rlResponses: string[] = [];
let _rlIdx = 0;

function makeMockInterface() {
  return {
    question: vi.fn((_q: string, cb: (a: string) => void) =>
      cb(_rlResponses[_rlIdx++] ?? ""),
    ),
    // readPassword non-TTY path: rl.once("line", handler)
    once: vi.fn((event: string, handler: (line: string) => void) => {
      if (event === "line") setImmediate(() => handler(_rlResponses[_rlIdx++] ?? ""));
    }),
    close: vi.fn(),
  };
}

// ── Module mocks ──────────────────────────────────────────────────────────────

// ora — returns a chainable spinner stub
const spinnerStub = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  warn: vi.fn().mockReturnThis(),
  text: "",
};
vi.mock("ora", () => ({ default: vi.fn(() => spinnerStub) }));

vi.mock("readline", () => ({
  default: { createInterface: vi.fn(() => makeMockInterface()) },
  createInterface: vi.fn(() => makeMockInterface()),
}));

vi.mock("./config.js", () => ({
  saveConfig: vi.fn(),
  loadConfig: vi.fn(() => ({})),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setInputs(...responses: string[]) {
  _rlResponses = responses;
  _rlIdx = 0;
}

function captureConsole(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
  return { lines, restore: () => { console.log = original; } };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runSignup() error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _rlIdx = 0;
    _rlResponses = [];
    // Re-assign chainable stubs after clearAllMocks
    spinnerStub.start = vi.fn().mockReturnThis();
    spinnerStub.succeed = vi.fn().mockReturnThis();
    spinnerStub.fail = vi.fn().mockReturnThis();
    spinnerStub.warn = vi.fn().mockReturnThis();
    // Ensure non-TTY so readPassword falls back to readline (no raw mode)
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });
  });

  // ── 1. Mismatched passwords ─────────────────────────────────────────────────
  it("rejects mismatched passwords before making any network call", async () => {
    // inputs: email, password, confirm-password
    setInputs("test@example.com", "hunter2!!", "different123");
    vi.stubGlobal("fetch", vi.fn());

    const cap = captureConsole();
    const { runSignup } = await import("./login.js");
    await runSignup("http://localhost:3000");
    cap.restore();

    // fetch must never have been called — the check is purely local
    expect(fetch).not.toHaveBeenCalled();

    // Output must contain the mismatch message
    const allOutput = cap.lines.join("\n");
    expect(allOutput).toMatch(/passwords do not match/i);
  });

  // ── 2. Duplicate email (409) ────────────────────────────────────────────────
  it("surfaces a 409 error and hints at aura-forge login", async () => {
    setInputs("existing@example.com", "Password123!", "Password123!");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: "An account with that email already exists" }),
        headers: { get: () => null },
      })),
    );

    const cap = captureConsole();
    const { runSignup } = await import("./login.js");
    await runSignup("http://localhost:3000");
    cap.restore();

    // Spinner should show the server error
    const failArgs = (spinnerStub.fail as Mock).mock.calls.flat().join(" ");
    expect(failArgs).toMatch(/account with that email already exists/i);

    // Console output should suggest the login command
    const allOutput = cap.lines.join("\n");
    expect(allOutput).toMatch(/aura-forge login/);
  });

  // ── 3. API server unreachable ───────────────────────────────────────────────
  it("shows a readable message when the server cannot be reached", async () => {
    setInputs("dev@example.com", "Password123!", "Password123!");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const cap = captureConsole();
    const { runSignup } = await import("./login.js");
    await runSignup("http://localhost:3000");
    cap.restore();

    // Spinner fail message must NOT expose a raw TypeError stack
    const failArgs = (spinnerStub.fail as Mock).mock.calls.flat().join(" ");
    expect(failArgs).not.toMatch(/TypeError|at runSignup|node:internal/);
    // Must be human-readable
    expect(failArgs).toMatch(/could not reach/i);

    // Extra hint should appear in console output
    const allOutput = cap.lines.join("\n");
    expect(allOutput).toMatch(/check your network/i);
  });
});
