/**
 * Slither static-analysis integration for EVM contracts.
 *
 * Runs `slither <file> --json -` on a temp .sol file, parses the JSON output
 * into structured findings, and returns a string ready to paste into the LLM
 * self-correction prompt so detected vulnerabilities drive targeted fixes.
 *
 * Install:  pip install slither-analyzer
 * Graceful fallback: if Slither is not installed (or times out), `available`
 * is false and the pipeline continues without static-analysis augmentation.
 */
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export interface SlitherFinding {
  check: string;
  impact: "High" | "Medium" | "Low" | "Informational" | "Optimization";
  confidence: "High" | "Medium" | "Low";
  description: string;
}

export interface SlitherResult {
  /** false when Slither is not installed or timed out */
  available: boolean;
  success: boolean;
  findings: SlitherFinding[];
  /** Ready to embed in an LLM prompt; empty string when no findings */
  formattedForLlm: string;
}

/** Only surface findings at these impact levels to the LLM */
const RELEVANT_IMPACTS = new Set(["High", "Medium"]);
const TIMEOUT_MS = 60_000;

export async function runSlither(
  solidityCode: string,
  _contractName: string,
): Promise<SlitherResult> {
  const tmpFile = join(tmpdir(), `slither_${randomUUID()}.sol`);
  try {
    await writeFile(tmpFile, solidityCode, "utf-8");
  } catch {
    return unavailable();
  }
  try {
    return await spawnSlither(tmpFile);
  } finally {
    unlink(tmpFile).catch(() => {});
  }
}

function unavailable(): SlitherResult {
  return { available: false, success: false, findings: [], formattedForLlm: "" };
}

function spawnSlither(filePath: string): Promise<SlitherResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let timedOut = false;

    // --solc-disable-warnings suppresses noisy output that can corrupt JSON
    const child = spawn(
      "slither",
      [filePath, "--json", "-", "--solc-disable-warnings"],
      { timeout: TIMEOUT_MS },
    );

    if (child.pid === undefined) {
      resolve(unavailable());
      return;
    }

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      resolve(unavailable());
    }, TIMEOUT_MS);

    child.on("error", () => { clearTimeout(timer); resolve(unavailable()); });

    child.on("close", () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(parseSlitherOutput(stdout));
    });
  });
}

function parseSlitherOutput(stdout: string): SlitherResult {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(stdout);
  } catch {
    // Non-JSON output → tool not installed or invocation error
    return unavailable();
  }

  const detectors = (
    (json?.results as Record<string, unknown>)?.detectors as unknown[]
  ) ?? [];

  if (!Array.isArray(detectors)) return unavailable();

  const findings: SlitherFinding[] = (detectors as Record<string, unknown>[])
    .filter((d) => RELEVANT_IMPACTS.has(String(d.impact ?? "")))
    .map((d) => ({
      check: String(d.check ?? "unknown"),
      impact: d.impact as SlitherFinding["impact"],
      confidence: d.confidence as SlitherFinding["confidence"],
      description: String(d.description ?? "")
        .replace(/\n/g, " ")
        .trim()
        .slice(0, 500),
    }));

  return {
    available: true,
    success: true,
    findings,
    formattedForLlm: formatFindingsForLlm(findings),
  };
}

function formatFindingsForLlm(findings: SlitherFinding[]): string {
  if (findings.length === 0) return "";
  const lines = [
    `SLITHER STATIC ANALYSIS — ${findings.length} finding(s) (deterministic tool; ALL must be fixed):`,
    "",
    ...findings.map(
      (f, i) =>
        `${i + 1}. [${f.impact.toUpperCase()} / confidence:${f.confidence}] ${f.check}\n   ${f.description}`,
    ),
  ];
  return lines.join("\n");
}
