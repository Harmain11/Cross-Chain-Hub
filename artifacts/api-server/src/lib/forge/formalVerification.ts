/**
 * Formal verification hooks — non-blocking, fire-and-forget.
 *
 * EVM  → Halmos  (symbolic execution, https://github.com/a16z/halmos)
 *          Install: pip install halmos
 * Rust → Kani    (bounded model checking, https://github.com/model-checking/kani)
 *          Install: cargo install --locked kani-verifier && cargo kani setup
 *
 * Neither tool blocks the main pipeline. The pipeline fires verification
 * asynchronously and emits a "verification" phase event when results arrive.
 * If the tool is not installed, `available` is false and a skip message is
 * emitted so the user knows how to enable it.
 */
import { spawn } from "child_process";
import { mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export interface FormalVerificationResult {
  available: boolean;
  tool: "halmos" | "kani";
  passed: boolean;
  counterexamplesFound: number;
  /** One-liner for the pipeline emit */
  summary: string;
  /** Truncated raw output for debugging */
  details: string;
}

const HALMOS_TIMEOUT_MS = 300_000; // 5 min — symbolic exec can be slow
const KANI_TIMEOUT_MS   = 300_000;

// ─── EVM: Halmos ──────────────────────────────────────────────────────────────

/**
 * Runs Halmos symbolic execution against the Foundry-style test suite.
 * Halmos looks for `check_*` / `prove_*` functions alongside regular Forge tests.
 * It proves properties rather than merely testing them with concrete inputs.
 */
export async function runHalmosVerification(
  contractCode: string,
  testCode: string,
  contractName: string,
): Promise<FormalVerificationResult> {
  const projectDir = join(tmpdir(), `halmos_${randomUUID()}`);

  try {
    await mkdir(join(projectDir, "src"),  { recursive: true });
    await mkdir(join(projectDir, "test"), { recursive: true });
    await writeFile(
      join(projectDir, "foundry.toml"),
      `[profile.default]\nsrc = "src"\nout = "out"\nlibs = ["lib"]\nsolc = "0.8.24"\n`,
    );
    await writeFile(join(projectDir, "src",  `${contractName}.sol`), contractCode);
    await writeFile(join(projectDir, "test", `${contractName}.t.sol`), testCode);

    return await execHalmos(projectDir, contractName);
  } catch {
    return notAvailable("halmos");
  } finally {
    rm(projectDir, { recursive: true, force: true }).catch(() => {});
  }
}

function execHalmos(
  projectDir: string,
  contractName: string,
): Promise<FormalVerificationResult> {
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;

    // --solver-timeout-assertion: per-assertion SMT budget in ms
    const child = spawn(
      "halmos",
      [
        "--contract", `${contractName}Test`,
        "--solver-timeout-assertion", "30000",
        "--loop", "3",
      ],
      { cwd: projectDir },
    );

    if (child.pid === undefined) { resolve(notAvailable("halmos")); return; }

    child.stdout.on("data", (c: Buffer) => { output += c.toString(); });
    child.stderr.on("data", (c: Buffer) => { output += c.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      resolve({
        available: true, tool: "halmos", passed: false,
        counterexamplesFound: 0,
        summary:
          "Halmos: verification timed out (> 5 min). " +
          "Simplify symbolic bounds or increase --solver-timeout-assertion.",
        details: output.slice(0, 2000),
      });
    }, HALMOS_TIMEOUT_MS);

    child.on("error", () => { clearTimeout(timer); resolve(notAvailable("halmos")); });
    child.on("close", () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(parseHalmosOutput(output));
    });
  });
}

function parseHalmosOutput(output: string): FormalVerificationResult {
  const counterexamples = (output.match(/Counterexample/gi) ?? []).length;
  const passed = counterexamples === 0 && /passed|no counterexample/i.test(output);
  return {
    available: true, tool: "halmos",
    passed,
    counterexamplesFound: counterexamples,
    summary: passed
      ? "Halmos: all symbolic assertions passed — no counterexamples found. Contract is formally verified for explored paths."
      : `Halmos: ${counterexamples} counterexample(s) found — mathematical proof failed. ` +
        "Review the output, add invariants, and re-run hardening.",
    details: output.slice(0, 3000),
  };
}

// ─── Solana/Rust: Kani ───────────────────────────────────────────────────────

/**
 * Runs Kani bounded model checking on Rust proof harnesses.
 * Programs should include `#[kani::proof]` annotated functions to verify
 * safety properties (no panics, no overflows, no out-of-bounds).
 */
export async function runKaniVerification(
  buildDir: string,
): Promise<FormalVerificationResult> {
  return execKani(buildDir);
}

function execKani(cwd: string): Promise<FormalVerificationResult> {
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;

    const child = spawn("cargo", ["kani"], { cwd });
    if (child.pid === undefined) { resolve(notAvailable("kani")); return; }

    child.stdout.on("data", (c: Buffer) => { output += c.toString(); });
    child.stderr.on("data", (c: Buffer) => { output += c.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      resolve({
        available: true, tool: "kani", passed: false,
        counterexamplesFound: 0,
        summary: "Kani: verification timed out (> 5 min).",
        details: output.slice(0, 2000),
      });
    }, KANI_TIMEOUT_MS);

    child.on("error", () => { clearTimeout(timer); resolve(notAvailable("kani")); });
    child.on("close", () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(parseKaniOutput(output));
    });
  });
}

function parseKaniOutput(output: string): FormalVerificationResult {
  const failures     = (output.match(/FAILED/gi)   ?? []).length;
  const verifications = (output.match(/VERIFIED/gi) ?? []).length;
  const passed = failures === 0 && verifications > 0;
  return {
    available: true, tool: "kani",
    passed,
    counterexamplesFound: failures,
    summary: passed
      ? `Kani: ${verifications} proof(s) verified — no safety violations found.`
      : `Kani: ${failures} failure(s) across ${verifications + failures} proof(s). ` +
        "Review harness and address unsafe patterns.",
    details: output.slice(0, 3000),
  };
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function notAvailable(tool: "halmos" | "kani"): FormalVerificationResult {
  const installCmd =
    tool === "halmos"
      ? "pip install halmos"
      : "cargo install --locked kani-verifier && cargo kani setup";
  return {
    available: false, tool,
    passed: false, counterexamplesFound: 0,
    summary:
      `${tool} not installed — formal verification skipped. ` +
      `Enable with: ${installCmd}`,
    details: "",
  };
}
