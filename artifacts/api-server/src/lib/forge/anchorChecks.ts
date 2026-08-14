/**
 * Anchor / cargo built-in checks for Solana programs.
 *
 * Runs `cargo clippy` with strict lint rules inside the Anchor build directory
 * and formats any warnings/errors as an LLM-ready string so the self-correction
 * loop can fix them alongside the LLM audit findings.
 *
 * Graceful fallback: if cargo/clippy is unavailable, `available` is false and
 * the pipeline continues with LLM-only auditing.
 */
import { spawn } from "child_process";

export interface AnchorCheckResult {
  /** false when cargo/clippy is not installed or the check timed out */
  available: boolean;
  clippyPassed: boolean;
  /** Ready to embed in an LLM prompt; empty string when no findings */
  formattedForLlm: string;
}

const CLIPPY_TIMEOUT_MS = 120_000; // 2 min

export async function runAnchorChecks(
  buildDir: string,
): Promise<AnchorCheckResult> {
  const result = await runCargo(
    // -D warnings turns warnings into errors so we capture all of them;
    // Anchor-specific lints are enabled via feature flags in the program itself.
    [
      "clippy",
      "--message-format=short",
      "--",
      "-D", "warnings",
      "-W", "clippy::all",
    ],
    buildDir,
  );

  if (!result.available) {
    return { available: false, clippyPassed: false, formattedForLlm: "" };
  }

  const findings = formatClippyOutput(result.output);
  return {
    available: true,
    clippyPassed: result.exitCode === 0,
    formattedForLlm: findings
      ? `CARGO CLIPPY FINDINGS (deterministic; ALL must be addressed):\n\n${findings}`
      : "",
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface CargoResult {
  available: boolean;
  exitCode: number;
  output: string;
}

function runCargo(args: string[], cwd: string): Promise<CargoResult> {
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;

    const child = spawn("cargo", args, { cwd });

    if (child.pid === undefined) {
      resolve({ available: false, exitCode: -1, output: "" });
      return;
    }

    child.stdout.on("data", (c: Buffer) => { output += c.toString(); });
    child.stderr.on("data", (c: Buffer) => { output += c.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      resolve({ available: true, exitCode: -1, output: "cargo clippy timed out after 2 minutes" });
    }, CLIPPY_TIMEOUT_MS);

    child.on("error", () => { clearTimeout(timer); resolve({ available: false, exitCode: -1, output: "" }); });

    child.on("close", (code) => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve({ available: true, exitCode: code ?? 0, output });
    });
  });
}

function formatClippyOutput(raw: string): string {
  const seen = new Set<string>();
  const findings: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith("warning:") || trimmed.startsWith("error:")) &&
      !seen.has(trimmed)
    ) {
      seen.add(trimmed);
      findings.push(trimmed);
      if (findings.length >= 25) break;
    }
  }

  return findings.join("\n");
}
