import { eq } from "drizzle-orm";
import { db, contractProjectsTable, type ContractProjectRow } from "@workspace/db";
import { compileSolidity, type EvmCompileResult } from "./evmCompile";
import { compileAnchorProgram, withTempBuildDir, type AnchorCompileResult } from "./solanaCompile";
import {
  repairSolidityContract,
  generateAnchorContract,
  repairAnchorContract,
  scoreContractSecurity,
  hardenAnchorContract,
  generateTestSuite,
} from "./llm";
import { getTemplate } from "./templates";
import { runAnchorChecks } from "./anchorChecks";
import { runKaniVerification } from "./formalVerification";
import { runEvmAgent, type AgentNote } from "./evmAgent";
import { runSolanaHardenAgent } from "./solanaAgent";

/**
 * Generates a matching test suite for the final contract version. Test-generation
 * failures must never fail the overall forge/harden pipeline — they are caught and
 * reported via `emit`, leaving testSuiteCode null.
 */
async function generateTestSuiteSafe(
  code: string,
  contractName: string,
  ecosystem: "EVM" | "SOLANA",
  idl: string | undefined,
  emit: (event: any) => void,
): Promise<string | null> {
  try {
    emit({ phase: "testing", message: "Generating test suite..." });
    const tests = await generateTestSuite(code, contractName, ecosystem, idl);
    emit({ phase: "testing", message: "Test suite generated." });
    return tests;
  } catch (err) {
    emit({
      phase: "testing",
      message: `Test suite generation did not complete: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
}

/**
 * Merges LLM audit notes with deterministic tool findings (Slither, clippy).
 * The combined string is fed to the hardening LLM so it addresses both in one pass.
 */
function combineNotes(llmNotes: string, toolFindings: string): string {
  return toolFindings ? `${llmNotes}\n\n${toolFindings}` : llmNotes;
}

export type ForgeEvent =
  | { phase: string; message: string }
  | { phase: "done"; project: ContractProjectRow }
  | { phase: "error"; message: string };

const MAX_HEAL_ATTEMPTS = 3;

// Solana-specific limits: cargo-build-sbf is 4–7 min per compile, so we
// lower the iteration count and accept a slightly less aggressive target to
// keep total generation time under ~15 minutes.
const MAX_SOLANA_HARDENING_ATTEMPTS = 2;
const TARGET_SOLANA_SECURITY_SCORE = 85;

/** Compiles `code`, self-healing compiler errors up to MAX_HEAL_ATTEMPTS times. */
async function compileWithSelfHeal(
  initialCode: string,
  contractName: string,
  emit: (event: ForgeEvent) => void,
  projectId: number,
): Promise<{ code: string; result: EvmCompileResult; log: string[] }> {
  const log: string[] = [];
  let code = initialCode;

  await setStatus(projectId, "compiling");
  emit({ phase: "compiling", message: "Compiling with solc..." });

  let result = compileSolidity(contractName, code);
  let attempt = 0;

  while (!result.success && attempt < MAX_HEAL_ATTEMPTS) {
    attempt += 1;
    log.push(`Attempt ${attempt} failed:\n${result.errors}`);
    await setStatus(projectId, "healing");
    emit({
      phase: "healing",
      message: `Compile failed, self-healing (attempt ${attempt}/${MAX_HEAL_ATTEMPTS})...`,
    });

    code = await repairSolidityContract(code, result.errors ?? "", contractName);

    await setStatus(projectId, "compiling");
    emit({ phase: "compiling", message: "Recompiling patched contract with solc..." });
    result = compileSolidity(contractName, code);
  }

  if (result.success) {
    log.push("Compilation succeeded.");
  } else {
    log.push(`Final attempt failed:\n${result.errors}`);
  }

  return { code, result, log };
}

/**
 * Compiles an Anchor program to a real .so via cargo-build-sbf and (unless
 * skipIdl=true) generates the real IDL, self-healing compiler errors up to
 * MAX_HEAL_ATTEMPTS times.  `buildDir` is reused across attempts so
 * incremental cargo compilation keeps repeat attempts fast.
 *
 * Pass `skipIdl: true` for intermediate validation compiles to save the
 * ~3-minute `anchor idl build` step; only the final save needs a real IDL.
 */
async function compileAnchorWithSelfHeal(
  initialCode: string,
  contractName: string,
  buildDir: string,
  emit: (event: ForgeEvent) => void,
  projectId: number,
  { skipIdl = false }: { skipIdl?: boolean } = {},
): Promise<{ code: string; result: AnchorCompileResult; log: string[] }> {
  const log: string[] = [];
  let code = initialCode;

  await setStatus(projectId, "compiling");
  emit({ phase: "compiling", message: `Compiling with cargo-build-sbf (Anchor)${skipIdl ? " (validation pass, skipping IDL build)" : ""}...` });

  let result = await compileAnchorProgram(code, contractName, buildDir, { skipIdl });

  if (result.toolchainUnavailable) {
    log.push(result.log);
    return { code, result, log };
  }

  let attempt = 0;
  while (!result.success && attempt < MAX_HEAL_ATTEMPTS) {
    attempt += 1;
    log.push(`Attempt ${attempt} failed:\n${result.log}`);
    await setStatus(projectId, "healing");
    emit({
      phase: "healing",
      message: `Compile failed, self-healing (attempt ${attempt}/${MAX_HEAL_ATTEMPTS})...`,
    });

    code = await repairAnchorContract(code, result.log, contractName);

    await setStatus(projectId, "compiling");
    emit({ phase: "compiling", message: "Recompiling patched program with cargo-build-sbf..." });
    result = await compileAnchorProgram(code, contractName, buildDir, { skipIdl });
  }

  if (result.success) {
    log.push("Compilation succeeded.");
  } else {
    log.push(`Final attempt failed:\n${result.log}`);
  }

  return { code, result, log };
}

async function setStatus(id: number, status: string) {
  await db
    .update(contractProjectsTable)
    .set({ status })
    .where(eq(contractProjectsTable.id, id));
}

export async function runForgePipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
): Promise<void> {
  try {
    if (project.ecosystem === "EVM") {
      await runEvmPipeline(project, emit);
    } else {
      await runSolanaPipeline(project, emit);
    }
  } catch (err) {
    await setStatus(project.id, "failed");
    emit({
      phase: "error",
      message: err instanceof Error ? err.message : "Forge job failed",
    });
  }
}

/**
 * EVM pipeline now runs through the ReAct AI agent (evmAgent.ts) instead of
 * the old scripted generate → compile → audit → harden loop.
 *
 * The agent decides at every step which tool to call (write_contract, compile,
 * run_slither, fetch_eip, audit_security, patch_function, generate_tests,
 * finish).  This enables:
 *   - Planning phase before any code is written
 *   - TDD: generate_tests before write_contract
 *   - Surgical function-level patching instead of full rewrites
 *   - Live EIP spec lookup for standards compliance
 *   - Persistent agent memory (agentNotes column in DB)
 */
async function runEvmPipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  await runEvmAgent(project, emit);
}

/**
 * Runs an on-demand "Improve Security" pass: starts from an existing
 * successful project's compiled code (rather than generating from scratch)
 * and runs the same hardening loop used at the end of the normal pipeline.
 * `child` is the new project row created to hold this re-run's results;
 * `parent` is the source project whose code is being hardened.
 */
export async function runHardenOnlyPipeline(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
): Promise<void> {
  try {
    if (!parent.smartContractCode) {
      throw new Error("Source project has no compiled code to harden");
    }
    if (parent.ecosystem === "EVM") {
      await hardenEvmOnly(child, parent, emit);
    } else {
      await hardenSolanaOnly(child, parent, emit);
    }
  } catch (err) {
    await setStatus(child.id, "failed");
    emit({
      phase: "error",
      message: err instanceof Error ? err.message : "Hardening job failed",
    });
  }
}

/**
 * EVM "Improve Security" re-run now goes through the full ReAct agent loop,
 * exactly like a fresh forge run, but with the parent project's existing code,
 * score, and notes pre-seeded into the agent's state and the parent's prior
 * agentNotes prepended to the scratchpad so the agent knows what has already
 * been tried.
 */
async function hardenEvmOnly(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  emit({
    phase: "auditing",
    message: `Starting agent-driven security-hardening pass on top of "${parent.contractName}"...`,
  });

  // Load the parent's prior scratchpad so the agent knows what was already tried.
  let parentAgentNotes: AgentNote[] = [];
  if (parent.agentNotes) {
    try {
      parentAgentNotes = JSON.parse(parent.agentNotes) as AgentNote[];
    } catch {
      // Malformed JSON — proceed with an empty prior history.
    }
  }

  await runEvmAgent(child, emit, {
    code: parent.smartContractCode!,
    securityScore: parent.securityScore ?? 0,
    securityNotes: parent.securityNotes ?? "",
    agentNotes: parentAgentNotes,
    upgradeable: parent.upgradeable ?? false,
    parentTestSuiteCode: parent.testSuiteCode ?? null,
  });
}

/**
 * Solana "Improve Security" re-run — now agent-driven.
 *
 * Delegates to runSolanaHardenAgent (solanaAgent.ts) which runs a ReAct-style
 * LLM loop (audit → patch_function → audit → … → finish).  Cargo toolchain
 * constraints are respected by keeping all iterations LLM-only; exactly one
 * final cargo compile is done here after the agent exits.
 */
async function hardenSolanaOnly(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  emit({
    phase: "auditing",
    message: `Starting agent-driven security-hardening pass on top of "${parent.contractName}"...`,
  });

  // Keep the parent's compiled binary as the fallback until a better one is produced.
  let bestSo: string | null = parent.compiledBytecode ?? null;

  // ── cargo clippy (Anchor built-in checks) — run in a temp build dir ──────
  let clippyFindings = "";
  await withTempBuildDir(async (clippyDir) => {
    emit({ phase: "auditing", message: "Running cargo clippy (Anchor built-in checks)..." });
    const clippy = await runAnchorChecks(clippyDir);
    if (clippy.available) {
      clippyFindings = clippy.formattedForLlm;
      emit({
        phase: "auditing",
        message: clippy.clippyPassed
          ? "cargo clippy: no warnings."
          : "cargo clippy: warnings detected — feeding into agent.",
      });
    } else {
      emit({ phase: "auditing", message: "cargo clippy unavailable — skipping Anchor built-in checks." });
    }
  }).catch(() => {});

  // ── Agent loop (LLM-only: audit → patch → audit → finish) ───────────────
  const agentResult = await runSolanaHardenAgent(child, parent, clippyFindings, emit);

  // ── One final cargo compile of the agent's best-scoring code ────────────
  //
  // Source/binary/IDL consistency guarantee — the three cases:
  //   1. Compile succeeds  → use the compiled result (code/IDL/so all come from one build).
  //   2. Compile fails     → revert to the parent's full artifact set (code/IDL/so/score all
  //                          from the parent) so the database always stores a matching triple.
  //   3. Toolchain unavailable → same as case 2: revert to parent's full artifact set.
  //                              Toolchain unavailability is an expected supported scenario,
  //                              not an exception; mixing generations is never acceptable.
  //   In cases 2 and 3 the agent's work is preserved in agentNotes for future re-runs.

  // Start by assuming we will fall back to the parent's artifact set.
  // Only case 1 (successful compile) will update these variables.
  let persistCode = parent.smartContractCode!;
  let persistIdl = parent.abiOrIdl ?? "";
  let persistSo = parent.compiledBytecode ?? null;
  let persistScore = parent.securityScore ?? 0;
  let persistNotes = parent.securityNotes ?? "";
  let persistContextQuestion: string | null = null;
  let persistGasNotes = parent.gasNotes ?? "";

  const compileLog: string[] = [];
  let compileLogHeader = "Anchor/cargo toolchain unavailable; hardening proceeded without a real rebuild. Parent artifact preserved.";

  await withTempBuildDir(async (buildDir) => {
    emit({ phase: "compiling", message: "Final compile of best-scoring code (with IDL build)..." });
    const final = await compileAnchorWithSelfHeal(
      agentResult.code, parent.contractName, buildDir, emit, child.id, { skipIdl: false },
    );
    compileLog.push(...final.log);

    if (final.result.toolchainUnavailable) {
      emit({
        phase: "compiling",
        message:
          "Anchor/cargo toolchain unavailable — reverting to parent's compiled artifact to keep source, IDL, and binary consistent. " +
          "Agent improvements are recorded in the history for future re-runs.",
      });
      // persistCode/IDL/So/Score etc. remain at parent values (set above).
      compileLogHeader = "Anchor/cargo toolchain unavailable; parent artifact preserved for source/binary consistency.";
    } else if (final.result.success) {
      // Require a real IDL from this build.  `anchor idl build` is non-fatal
      // inside compileAnchorWithSelfHeal, so a successful .so may still carry
      // a null IDL.  If the IDL is missing we cannot guarantee the interface
      // descriptor matches the new binary, so we revert to the full parent set.
      if (!final.result.idl) {
        emit({
          phase: "compiling",
          message:
            "Compile succeeded but IDL generation failed — reverting to parent's compiled artifact " +
            "to keep source, IDL, and binary consistent.",
        });
        compileLogHeader = "IDL generation failed after successful compile; parent artifact preserved for source/IDL/binary consistency.";
        // persistCode/IDL/So/Score etc. remain at parent values.
      } else {
        emit({ phase: "compiling", message: `Final compile succeeded: ${final.result.soSizeBytes} bytes, real IDL produced.` });

        // If self-healing changed the source, the agent's audit score no longer
        // describes the saved code.  Re-audit the healed code so the persisted
        // score always corresponds to the exact source being stored.
        let compiledScore = agentResult.securityScore;
        let compiledNotes = agentResult.securityNotes;
        let compiledContextQuestion = agentResult.contextQuestion;
        let compiledGasNotes = agentResult.gasNotes;

        if (final.code !== agentResult.code) {
          emit({ phase: "auditing", message: "Self-heal changed the source — re-auditing compiled code to align score with saved artifact..." });
          const reaudited = await scoreContractSecurity(final.code, "SOLANA");
          compiledScore = reaudited.score;
          compiledNotes = reaudited.notes;
          compiledContextQuestion = reaudited.score >= TARGET_SOLANA_SECURITY_SCORE ? null : reaudited.contextQuestion;
          compiledGasNotes = reaudited.gasNotes;
          emit({ phase: "auditing", message: `Re-audit after self-heal: ${reaudited.score}/100.` });
        }

        // All three artifacts come from this single build — source/IDL/binary are consistent.
        persistCode = final.code;
        persistIdl = final.result.idl;
        persistSo = final.result.soBase64 ?? null;
        persistScore = compiledScore;
        persistNotes = compiledNotes;
        persistContextQuestion = compiledContextQuestion;
        persistGasNotes = compiledGasNotes;
        compileLogHeader = "";
      }
    } else {
      // Compile failed — revert to parent's full artifact so source/IDL/binary match.
      emit({
        phase: "compiling",
        message:
          "Final compile failed — reverting to parent's compiled artifact to keep source, IDL, and binary consistent. " +
          "Agent improvements are recorded in the history for future re-runs.",
      });
      compileLogHeader = "Final compile of agent-improved source failed; parent artifact preserved for source/binary consistency.";
      // persistCode/IDL/So/Score etc. remain at parent values (set above).
    }

    // ── Kani formal verification (non-blocking, uses the build dir) ──────
    runKaniVerification(buildDir)
      .then((fv) => { if (fv.available) emit({ phase: "verification", message: fv.summary }); })
      .catch(() => {});
  });

  const testSuiteCode = await generateTestSuiteSafe(persistCode, parent.contractName, "SOLANA", persistIdl, emit);

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: persistCode,
      compiledBytecode: persistSo,
      abiOrIdl: persistIdl,
      securityScore: persistScore,
      securityNotes: persistNotes,
      securityContextQuestion: persistContextQuestion,
      compileLog: compileLogHeader
        ? `${compileLogHeader}\n\n${compileLog.join("\n\n")}`.trim()
        : compileLog.join("\n\n"),
      testSuiteCode,
      gasNotes: persistGasNotes || null,
      agentNotes: JSON.stringify(agentResult.agentNotes),
    })
    .where(eq(contractProjectsTable.id, child.id))
    .returning();

  emit({ phase: "done", project: updated! });
}

/**
 * Optimised Solana pipeline.
 *
 * Key differences vs the EVM pipeline:
 * - cargo-build-sbf takes 4-7 min; doing it inside every hardening iteration
 *   would make a 5-pass run take 35+ minutes.
 * - Strategy: one initial cargo compile (with skipIdl) to validate the
 *   generated code, then a fast LLM-only hardening loop, then one final
 *   cargo compile (with IDL) of the best-scoring code.
 * - Lower iteration cap (MAX_SOLANA_HARDENING_ATTEMPTS) and score target
 *   (TARGET_SOLANA_SECURITY_SCORE) vs EVM because Rust/Anchor programs have
 *   naturally higher starting scores and fewer low-hanging fixes.
 */
async function runSolanaPipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  await setStatus(project.id, "generating");
  emit({ phase: "generating", message: "Generating Anchor (Rust) program and IDL..." });

  const template = getTemplate("SOLANA", project.templateId);
  const generated = await generateAnchorContract(
    project.prompt,
    project.contractName,
    template?.promptFragment,
  );
  let bestCode = generated.code;
  let bestIdl = generated.idl;

  await withTempBuildDir(async (buildDir) => {
    const compileLog: string[] = [];
    let toolchainUnavailable = false;

    // ── Step 1: initial compile (validation only, skip slow IDL build) ──────
    const initial = await compileAnchorWithSelfHeal(
      bestCode, project.contractName, buildDir, emit, project.id, { skipIdl: true },
    );
    compileLog.push(...initial.log);
    bestCode = initial.code;

    let initialSo: string | undefined;
    let initialRent: number | undefined;

    if (initial.result.toolchainUnavailable) {
      toolchainUnavailable = true;
      emit({
        phase: "compiling",
        message: "Anchor/cargo toolchain unavailable; continuing with generated source only.",
      });
    } else if (!initial.result.success) {
      emit({
        phase: "compiling",
        message: "Compilation failed after self-healing attempts; continuing with the last generated source (unbuilt).",
      });
    } else {
      initialSo = initial.result.soBase64;
      initialRent = initial.result.rentExemptLamports;
      emit({ phase: "compiling", message: `Validation compile succeeded (${initial.result.soSizeBytes} bytes). Skipping IDL build until final pass.` });
    }

    // ── Step 2: Anchor built-in checks (cargo clippy) ───────────────────────
    let anchorFindings = "";
    if (!toolchainUnavailable) {
      emit({ phase: "auditing", message: "Running cargo clippy (Anchor built-in checks)..." });
      const clippy = await runAnchorChecks(buildDir);
      if (clippy.available) {
        anchorFindings = clippy.formattedForLlm;
        emit({
          phase: "auditing",
          message: clippy.clippyPassed
            ? "cargo clippy: no warnings."
            : "cargo clippy: warnings detected — feeding into self-correction loop.",
        });
      } else {
        emit({ phase: "auditing", message: "cargo clippy unavailable — skipping Anchor built-in checks." });
      }
    }

    // ── Step 3: initial security audit ──────────────────────────────────────
    emit({ phase: "auditing", message: "Running LLM security audit..." });
    let { score: bestScore, notes: bestNotes, contextQuestion: bestContextQuestion, gasNotes: bestGasNotes } =
      await scoreContractSecurity(bestCode, "SOLANA");
    emit({ phase: "auditing", message: `Security score: ${bestScore}/100. ${bestNotes}` });

    // ── Step 4: LLM-only hardening loop (no cargo recompile per iteration) ──
    let hardenAttempt = 0;
    while (bestScore < TARGET_SOLANA_SECURITY_SCORE && hardenAttempt < MAX_SOLANA_HARDENING_ATTEMPTS) {
      hardenAttempt += 1;
      await setStatus(project.id, "hardening");
      emit({
        phase: "hardening",
        message: `Score ${bestScore}/100 below target ${TARGET_SOLANA_SECURITY_SCORE} — hardening (attempt ${hardenAttempt}/${MAX_SOLANA_HARDENING_ATTEMPTS}, LLM only)...`,
      });

      // Combine LLM audit notes with deterministic clippy findings.
      const combinedNotes = combineNotes(bestNotes, anchorFindings);
      let hardened: { code: string; idl: string };
      try {
        hardened = await hardenAnchorContract(
          bestCode, bestIdl, combinedNotes, bestScore, project.contractName,
          project.userContext ?? undefined,
        );
      } catch (err) {
        emit({
          phase: "hardening",
          message: `Hardening pass failed (${err instanceof Error ? err.message : "unknown error"}); keeping previous best version.`,
        });
        continue;
      }

      emit({ phase: "auditing", message: "Re-auditing hardened program..." });
      const rescored = await scoreContractSecurity(hardened.code, "SOLANA");
      emit({ phase: "auditing", message: `Security score: ${rescored.score}/100. ${rescored.notes}` });

      if (rescored.score >= bestScore) {
        bestCode = hardened.code;
        bestIdl = hardened.idl;
        bestScore = rescored.score;
        bestNotes = rescored.notes;
        bestContextQuestion = rescored.contextQuestion;
        bestGasNotes = rescored.gasNotes;
      } else {
        emit({
          phase: "hardening",
          message: `Score regressed (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
        });
      }
    }

    if (bestScore >= TARGET_SOLANA_SECURITY_SCORE) {
      bestContextQuestion = null;
      emit({ phase: "auditing", message: `Reached target security score: ${bestScore}/100.` });
    } else {
      emit({
        phase: "auditing",
        message: `Stopped after ${hardenAttempt} hardening attempt(s). Best achieved: ${bestScore}/100 (target ${TARGET_SOLANA_SECURITY_SCORE}).`,
      });
      if (bestContextQuestion) {
        emit({ phase: "auditing", message: `Providing more detail would improve this recommendation: ${bestContextQuestion}` });
      }
    }

    // ── Step 4: one final cargo compile with real IDL generation ────────────
    let bestSo: string | undefined = initialSo;
    let bestRent: number | undefined = initialRent;

    if (!toolchainUnavailable && bestCode !== initial.code) {
      // Best code differs from the initially compiled code — recompile it
      // with full IDL generation so the saved artefact is consistent.
      emit({ phase: "compiling", message: "Final compile of best-scoring code (with IDL build)..." });
      const final = await compileAnchorWithSelfHeal(
        bestCode, project.contractName, buildDir, emit, project.id, { skipIdl: false },
      );
      compileLog.push(...final.log);
      if (final.result.success) {
        bestCode = final.code;
        bestIdl = final.result.idl ?? bestIdl;
        bestSo = final.result.soBase64;
        bestRent = final.result.rentExemptLamports;
        emit({ phase: "compiling", message: `Final compile succeeded: ${final.result.soSizeBytes} bytes${final.result.idl ? ", real IDL produced" : ""}.` });
      } else {
        // Fall back to the initial compiled .so; best code stays as the
        // highest-scoring LLM output even if it didn't compile.
        emit({ phase: "compiling", message: "Final compile failed; keeping initially compiled binary and best LLM IDL." });
        bestSo = initialSo;
      }
    } else if (!toolchainUnavailable && bestCode === initial.code) {
      // Code didn't change through hardening — run IDL build on the already
      // compiled artefact rather than recompiling from scratch.
      emit({ phase: "compiling", message: "Generating real IDL for compiled program..." });
      const withIdl = await compileAnchorWithSelfHeal(
        bestCode, project.contractName, buildDir, emit, project.id, { skipIdl: false },
      );
      compileLog.push(...withIdl.log);
      if (withIdl.result.success) {
        bestIdl = withIdl.result.idl ?? bestIdl;
        bestSo = withIdl.result.soBase64 ?? bestSo;
        bestRent = withIdl.result.rentExemptLamports ?? bestRent;
      }
    }

    // ── Step 5: test generation ──────────────────────────────────────────────
    const testSuiteCode = await generateTestSuiteSafe(bestCode, project.contractName, "SOLANA", bestIdl, emit);

    // ── Kani formal verification (non-blocking, uses the build dir) ──────
    if (!toolchainUnavailable) {
      runKaniVerification(buildDir)
        .then((fv) => { if (fv.available) emit({ phase: "verification", message: fv.summary }); })
        .catch(() => {});
    }

    const rentNote = bestRent != null
      ? `Real rent-exemption minimum for the compiled program account: ${bestRent.toLocaleString()} lamports (computed by \`solana rent\` from the actual .so size).`
      : null;

    const [updated] = await db
      .update(contractProjectsTable)
      .set({
        status: "success",
        smartContractCode: bestCode,
        compiledBytecode: bestSo ?? null,
        abiOrIdl: bestIdl,
        securityScore: bestScore,
        securityNotes: bestNotes,
        securityContextQuestion: bestContextQuestion,
        compileLog: toolchainUnavailable
          ? "Anchor/cargo toolchain unavailable; hardening proceeded without a real rebuild."
          : compileLog.join("\n\n"),
        testSuiteCode,
        gasNotes: rentNote ? `${bestGasNotes || ""}\n\n${rentNote}`.trim() : (bestGasNotes || null),
      })
      .where(eq(contractProjectsTable.id, project.id))
      .returning();

    emit({ phase: "done", project: updated! });
  });
}
