/**
 * Unit tests for runLogout() — degraded-mode and revocation paths.
 *
 * Scenarios covered:
 *  1. No API key in config → early exit, no network call, no saveConfig
 *  2. Network failure (fetch throws) → warning printed, local config cleared
 *  3. Server unreachable / non-OK list response → warning printed, local config cleared
 *  4. DELETE returns 404 (key already gone) → treated as success, spinner.succeed called
 *  5. DELETE returns unexpected error (e.g. 500) → warning printed, local config still cleared
 *  6. Key found and successfully revoked → spinner.succeed, local config cleared
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Spinner stub ──────────────────────────────────────────────────────────────
const spinnerStub = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  warn: vi.fn().mockReturnThis(),
  text: "",
};
vi.mock("ora", () => ({ default: vi.fn(() => spinnerStub) }));

// ── Config mock ───────────────────────────────────────────────────────────────
const mockSaveConfig = vi.fn();
const mockLoadConfig = vi.fn();

vi.mock("./config.js", () => ({
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal key prefix: "af_live_" (8) + 6 chars = 14 chars */
const API_KEY = "af_live_ABCDEF_secret_stuff";
const KEY_PREFIX = API_KEY.slice(0, 14); // "af_live_ABCDEF"

function makeListResponse(keys: Array<{ id: number; label: string; keyPrefix: string; revokedAt: string | null }>) {
  return {
    ok: true,
    status: 200,
    json: async () => keys,
  };
}

function makeDeleteResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runLogout()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spinnerStub.start = vi.fn().mockReturnThis();
    spinnerStub.succeed = vi.fn().mockReturnThis();
    spinnerStub.fail = vi.fn().mockReturnThis();
    spinnerStub.warn = vi.fn().mockReturnThis();
  });

  // ── 1. Already logged out ──────────────────────────────────────────────────
  it("exits early when no API key is stored — no network calls, no saveConfig", async () => {
    mockLoadConfig.mockReturnValue({});
    vi.stubGlobal("fetch", vi.fn());

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    expect(fetch).not.toHaveBeenCalled();
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  // ── 2. Network failure during list ─────────────────────────────────────────
  it("clears local config and warns when the network is unreachable", async () => {
    mockLoadConfig.mockReturnValue({ apiKey: API_KEY });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    // Warning must have been shown — not a hard failure
    expect((spinnerStub.warn as Mock).mock.calls.length).toBeGreaterThan(0);
    const warnText = (spinnerStub.warn as Mock).mock.calls.flat().join(" ");
    expect(warnText).toMatch(/could not reach server/i);

    // Local config must always be cleared
    expect(mockSaveConfig).toHaveBeenCalledWith({ apiKey: undefined });

    // Process must not crash — if we reach here, it exited cleanly
  });

  // ── 3. Server returns non-OK from list ─────────────────────────────────────
  it("clears local config and warns when the list endpoint returns non-OK", async () => {
    mockLoadConfig.mockReturnValue({ apiKey: API_KEY });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
      })),
    );

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    const warnText = (spinnerStub.warn as Mock).mock.calls.flat().join(" ");
    expect(warnText).toMatch(/could not reach server/i);
    expect(mockSaveConfig).toHaveBeenCalledWith({ apiKey: undefined });
  });

  // ── 4. DELETE returns 404 (key already gone) ───────────────────────────────
  it("treats a 404 on DELETE as success — spinner.succeed called, local config cleared", async () => {
    mockLoadConfig.mockReturnValue({ apiKey: API_KEY });

    const matchingKey = { id: 42, label: "CLI", keyPrefix: KEY_PREFIX, revokedAt: null };
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string }) => {
        callCount++;
        if (!init?.method || init.method === "GET") {
          return makeListResponse([matchingKey]);
        }
        if (init.method === "DELETE") {
          return makeDeleteResponse(404);
        }
        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    // 404 is treated as "already gone" → server revoked = true
    expect((spinnerStub.succeed as Mock).mock.calls.length).toBeGreaterThan(0);
    const succeedText = (spinnerStub.succeed as Mock).mock.calls.flat().join(" ");
    expect(succeedText).toMatch(/logged out/i);

    // Local config still cleared
    expect(mockSaveConfig).toHaveBeenCalledWith({ apiKey: undefined });

    // No warning should appear for the 404 case
    expect((spinnerStub.warn as Mock).mock.calls.length).toBe(0);
  });

  // ── 5. DELETE returns unexpected server error (e.g. 500) ───────────────────
  it("warns but still clears local config when DELETE fails with 500", async () => {
    mockLoadConfig.mockReturnValue({ apiKey: API_KEY });

    const matchingKey = { id: 99, label: "CLI", keyPrefix: KEY_PREFIX, revokedAt: null };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (!init?.method || init.method === "GET") {
          return makeListResponse([matchingKey]);
        }
        if (init.method === "DELETE") {
          return makeDeleteResponse(500);
        }
        throw new Error("Unexpected fetch call");
      }),
    );

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    // A warning must be issued for the unrevoked key
    expect((spinnerStub.warn as Mock).mock.calls.length).toBeGreaterThan(0);
    const warnText = (spinnerStub.warn as Mock).mock.calls.flat().join(" ");
    expect(warnText).toMatch(/could not revoke key on server/i);

    // Local config is still cleared regardless
    expect(mockSaveConfig).toHaveBeenCalledWith({ apiKey: undefined });
  });

  // ── 6. Happy path: key found and successfully revoked ──────────────────────
  it("revokes the key server-side and clears local config on success", async () => {
    mockLoadConfig.mockReturnValue({ apiKey: API_KEY });

    const matchingKey = { id: 7, label: "CLI", keyPrefix: KEY_PREFIX, revokedAt: null };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (!init?.method || init.method === "GET") {
          return makeListResponse([matchingKey]);
        }
        if (init.method === "DELETE") {
          return makeDeleteResponse(200);
        }
        throw new Error("Unexpected fetch call");
      }),
    );

    const { runLogout } = await import("./login.js");
    await runLogout("http://localhost:3000");

    // No warning expected on a clean revocation
    expect((spinnerStub.warn as Mock).mock.calls.length).toBe(0);

    // Success spinner
    expect((spinnerStub.succeed as Mock).mock.calls.length).toBeGreaterThan(0);
    const succeedText = (spinnerStub.succeed as Mock).mock.calls.flat().join(" ");
    expect(succeedText).toMatch(/logged out/i);

    // Local config cleared
    expect(mockSaveConfig).toHaveBeenCalledWith({ apiKey: undefined });
  });
});
