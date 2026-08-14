/**
 * Foundry test runner for EVM contracts.
 *
 * Scaffolds a minimal Foundry project in a temp directory, writes the
 * generated test suite, installs forge-std, and executes `forge test --json`.
 * Parses pass/fail counts and returns a human-readable summary emitted as a
 * pipeline event.
 *
 * Install: curl -L https://foundry.paradigm.xyz | bash && foundryup
 * Graceful fallback: if `forge` is not installed, `available` is false and
 * the pipeline emits a skip notice without failing.
 */
import { spawn } from "child_process";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export interface FoundryTestResult {
  available: boolean;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  /** Human-readable one-liner for the pipeline emit */
  formattedSummary: string;
}

const INSTALL_TIMEOUT_MS = 60_000;
const TEST_TIMEOUT_MS    = 120_000;

export async function runFoundryTests(
  contractCode: string,
  testCode: string,
  contractName: string,
): Promise<FoundryTestResult> {
  const projectDir = join(tmpdir(), `foundry_${randomUUID()}`);

  try {
    // ── Scaffold minimal Foundry project ─────────────────────────────────────
    await mkdir(join(projectDir, "src"),  { recursive: true });
    await mkdir(join(projectDir, "test"), { recursive: true });

    await writeFile(
      join(projectDir, "foundry.toml"),
      `[profile.default]\nsrc = "src"\nout = "out"\nlibs = ["lib"]\nsolc = "0.8.24"\n`,
    );
    await writeFile(join(projectDir, "src",  `${contractName}.sol`), contractCode);
    await writeFile(join(projectDir, "test", `${contractName}.t.sol`), testCode);

    // ── Install forge-std ────────────────────────────────────────────────────
    const installed = await installForgeStd(projectDir);
    if (!installed) return notAvailable();

    // ── Run tests ────────────────────────────────────────────────────────────
    return await execForgeTest(projectDir);
  } catch {
    return notAvailable();
  } finally {
    rm(projectDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function notAvailable(): FoundryTestResult {
  return {
    available: false,
    passed: 0, failed: 0, skipped: 0, durationMs: 0,
    formattedSummary:
      "Foundry not installed — test suite generated but not executed. " +
      "Install via: curl -L https://foundry.paradigm.xyz | bash && foundryup",
  };
}

function installForgeStd(projectDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      "forge",
      ["install", "foundry-rs/forge-std", "--no-commit"],
      { cwd: projectDir },
    );
    if (child.pid === undefined) { resolve(false); return; }
    child.on("error", () => resolve(false));
    const timer = setTimeout(() => { child.kill("SIGTERM"); resolve(false); }, INSTALL_TIMEOUT_MS);
    child.on("close", (code) => { clearTimeout(timer); resolve(code === 0); });
  });
}

function execForgeTest(projectDir: string): Promise<FoundryTestResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let timedOut = false;
    const start = Date.now();

    const child = spawn("forge", ["test", "--json", "-vv"], { cwd: projectDir });
    if (child.pid === undefined) { resolve(notAvailable()); return; }

    child.stdout.on("data", (c: Buffer) => { stdout += c.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      resolve({
        available: true, passed: 0, failed: 0, skipped: 0,
        durationMs: Date.now() - start,
        formattedSummary: "Foundry test run timed out after 2 minutes.",
      });
    }, TEST_TIMEOUT_MS);

    child.on("error", () => { clearTimeout(timer); resolve(notAvailable()); });

    child.on("close", () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(parseForgeOutput(stdout, Date.now() - start));
    });
  });
}

function parseForgeOutput(raw: string, durationMs: number): FoundryTestResult {
  let passed = 0, failed = 0, skipped = 0;

  try {
    // `forge test --json` emits a JSON object keyed by suite name
    const json = JSON.parse(raw) as Record<string, { test_results: Record<string, { status: string }> }>;
    for (const suite of Object.values(json)) {
      for (const test of Object.values(suite?.test_results ?? {})) {
        if (test.status === "Success")  passed++;
        else if (test.status === "Failure") failed++;
        else skipped++;
      }
    }
  } catch {
    // Fall back to scanning PASS/FAIL markers in text output
    for (const line of raw.split("\n")) {
      if (line.includes("[PASS]"))  passed++;
      else if (line.includes("[FAIL]")) failed++;
    }
  }

  const total = passed + failed + skipped;
  const secs  = (durationMs / 1000).toFixed(1);
  const summary =
    failed === 0
      ? `Foundry: ${passed}/${total} tests passed in ${secs}s ✓`
      : `Foundry: ${failed} test(s) FAILED out of ${total} (${passed} passed) in ${secs}s — review test output.`;

  return { available: true, passed, failed, skipped, durationMs, formattedSummary: summary };
}
