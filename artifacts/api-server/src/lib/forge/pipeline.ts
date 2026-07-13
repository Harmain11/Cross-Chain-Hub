import { eq } from "drizzle-orm";
import { db, contractProjectsTable, type ContractProjectRow } from "@workspace/db";
import { compileSolidity, type EvmCompileResult } from "./evmCompile";
import { compileAnchorProgram, withTempBuildDir, type AnchorCompileResult } from "./solanaCompile";
import {
  generateSolidityContract,
  repairSolidityContract,
  generateAnchorContract,
  repairAnchorContract,
  scoreContractSecurity,
  hardenSolidityContract,
  hardenAnchorContract,
  generateTestSuite,
} from "./llm";
import { getTemplate, UPGRADEABLE_EVM_FRAGMENT } from "./templates";

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

export type ForgeEvent =
  | { phase: string; message: string }
  | { phase: "done"; project: ContractProjectRow }
  | { phase: "error"; message: string };

const MAX_HEAL_ATTEMPTS = 3;
const MAX_SECURITY_HARDENING_ATTEMPTS = 5;
const TARGET_SECURITY_SCORE = 95;

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
 * Compiles an Anchor program to a real .so via cargo-build-sbf and generates
 * its real IDL, self-healing compiler errors up to MAX_HEAL_ATTEMPTS times.
 * `buildDir` is reused across attempts (and across hardening iterations by
 * the caller) so incremental cargo compilation keeps repeat attempts fast.
 */
async function compileAnchorWithSelfHeal(
  initialCode: string,
  contractName: string,
  buildDir: string,
  emit: (event: ForgeEvent) => void,
  projectId: number,
): Promise<{ code: string; result: AnchorCompileResult; log: string[] }> {
  const log: string[] = [];
  let code = initialCode;

  await setStatus(projectId, "compiling");
  emit({ phase: "compiling", message: "Compiling with cargo-build-sbf (Anchor)..." });

  let result = await compileAnchorProgram(code, contractName, buildDir);

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
    result = await compileAnchorProgram(code, contractName, buildDir);
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

async function runEvmPipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  await setStatus(project.id, "generating");
  emit({ phase: "generating", message: "Generating Solidity contract..." });

  const template = getTemplate("EVM", project.templateId);
  const initialCode = await generateSolidityContract(
    project.prompt,
    project.contractName,
    template?.promptFragment,
    project.upgradeable ? UPGRADEABLE_EVM_FRAGMENT : undefined,
  );
  const compileLog: string[] = [];

  const first = await compileWithSelfHeal(initialCode, project.contractName, emit, project.id);
  compileLog.push(...first.log);

  if (!first.result.success) {
    await db
      .update(contractProjectsTable)
      .set({
        status: "failed",
        smartContractCode: first.code,
        compileLog: compileLog.join("\n\n"),
      })
      .where(eq(contractProjectsTable.id, project.id));
    emit({ phase: "error", message: "Compilation failed after self-healing attempts." });
    return;
  }

  emit({ phase: "compiling", message: "Compilation succeeded." });

  // Best-known-good candidate so far (always compiles successfully).
  let bestCode = first.code;
  let bestResult = first.result;

  emit({ phase: "auditing", message: "Running LLM security audit..." });
  let { score: bestScore, notes: bestNotes, contextQuestion: bestContextQuestion, gasNotes: bestGasNotes } =
    await scoreContractSecurity(bestCode, "EVM", project.upgradeable, bestResult.gasEstimates);
  emit({
    phase: "auditing",
    message: `Security score: ${bestScore}/100. ${bestNotes}`,
  });

  let hardenAttempt = 0;
  while (bestScore < TARGET_SECURITY_SCORE && hardenAttempt < MAX_SECURITY_HARDENING_ATTEMPTS) {
    hardenAttempt += 1;
    await setStatus(project.id, "hardening");
    emit({
      phase: "hardening",
      message: `Security score ${bestScore}/100 is below the ${TARGET_SECURITY_SCORE} target — hardening contract (attempt ${hardenAttempt}/${MAX_SECURITY_HARDENING_ATTEMPTS})...`,
    });

    const hardenedCode = await hardenSolidityContract(
      bestCode,
      bestNotes,
      bestScore,
      project.contractName,
      project.userContext ?? undefined,
    );

    const recompiled = await compileWithSelfHeal(
      hardenedCode,
      project.contractName,
      emit,
      project.id,
    );
    compileLog.push(...recompiled.log);

    if (!recompiled.result.success) {
      emit({
        phase: "hardening",
        message: "Hardened contract failed to compile even after self-healing; keeping previous best version.",
      });
      continue;
    }

    emit({ phase: "auditing", message: "Re-auditing hardened contract..." });
    const rescored = await scoreContractSecurity(
      recompiled.code,
      "EVM",
      project.upgradeable,
      recompiled.result.gasEstimates,
    );
    emit({
      phase: "auditing",
      message: `Security score: ${rescored.score}/100. ${rescored.notes}`,
    });

    if (rescored.score >= bestScore) {
      bestCode = recompiled.code;
      bestResult = recompiled.result;
      bestScore = rescored.score;
      bestNotes = rescored.notes;
      bestContextQuestion = rescored.contextQuestion;
      bestGasNotes = rescored.gasNotes;
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  if (bestScore >= TARGET_SECURITY_SCORE) {
    bestContextQuestion = null;
    emit({
      phase: "auditing",
      message: `Reached target security score: ${bestScore}/100.`,
    });
  } else {
    emit({
      phase: "auditing",
      message: `Stopped after ${MAX_SECURITY_HARDENING_ATTEMPTS} hardening attempts. Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
    });
    if (bestContextQuestion) {
      emit({
        phase: "auditing",
        message: `Providing more detail would improve this recommendation: ${bestContextQuestion}`,
      });
    }
  }

  const testSuiteCode = await generateTestSuiteSafe(bestCode, project.contractName, "EVM", undefined, emit);

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: bestResult.bytecode,
      abiOrIdl: JSON.stringify(bestResult.abi),
      securityScore: bestScore,
      securityNotes: bestNotes,
      securityContextQuestion: bestContextQuestion,
      compileLog: compileLog.join("\n\n"),
      testSuiteCode,
      gasEstimates: bestResult.gasEstimates ? JSON.stringify(bestResult.gasEstimates) : null,
      gasNotes: bestGasNotes || null,
    })
    .where(eq(contractProjectsTable.id, project.id))
    .returning();

  emit({ phase: "done", project: updated! });
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

async function hardenEvmOnly(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  emit({
    phase: "auditing",
    message: `Starting a new security-hardening pass on top of "${parent.contractName}"...`,
  });

  const seed = await compileWithSelfHeal(
    parent.smartContractCode!,
    parent.contractName,
    emit,
    child.id,
  );
  const compileLog: string[] = [...seed.log];

  if (!seed.result.success) {
    await db
      .update(contractProjectsTable)
      .set({ status: "failed", smartContractCode: seed.code, compileLog: compileLog.join("\n\n") })
      .where(eq(contractProjectsTable.id, child.id));
    emit({ phase: "error", message: "Source contract failed to recompile; cannot harden." });
    return;
  }

  let bestCode = seed.code;
  let bestResult = seed.result;
  let bestScore = parent.securityScore ?? 0;
  let bestNotes = parent.securityNotes ?? "";
  let bestContextQuestion: string | null = null;
  let bestGasNotes = parent.gasNotes ?? "";

  if (parent.securityScore === null) {
    emit({ phase: "auditing", message: "Running LLM security audit..." });
    const scored = await scoreContractSecurity(bestCode, "EVM", parent.upgradeable, bestResult.gasEstimates);
    bestScore = scored.score;
    bestNotes = scored.notes;
    bestContextQuestion = scored.contextQuestion;
    bestGasNotes = scored.gasNotes;
  }

  let hardenAttempt = 0;
  while (
    hardenAttempt < MAX_SECURITY_HARDENING_ATTEMPTS &&
    (hardenAttempt === 0 || bestScore < TARGET_SECURITY_SCORE)
  ) {
    hardenAttempt += 1;
    await setStatus(child.id, "hardening");
    emit({
      phase: "hardening",
      message: `Hardening contract (attempt ${hardenAttempt}/${MAX_SECURITY_HARDENING_ATTEMPTS}), current score ${bestScore}/100...`,
    });

    const hardenedCode = await hardenSolidityContract(
      bestCode,
      bestNotes,
      bestScore,
      parent.contractName,
      child.userContext ?? undefined,
    );
    const recompiled = await compileWithSelfHeal(hardenedCode, parent.contractName, emit, child.id);
    compileLog.push(...recompiled.log);

    if (!recompiled.result.success) {
      emit({
        phase: "hardening",
        message: "Hardened contract failed to compile even after self-healing; keeping previous best version.",
      });
      continue;
    }

    emit({ phase: "auditing", message: "Re-auditing hardened contract..." });
    const rescored = await scoreContractSecurity(
      recompiled.code,
      "EVM",
      parent.upgradeable,
      recompiled.result.gasEstimates,
    );
    emit({ phase: "auditing", message: `Security score: ${rescored.score}/100. ${rescored.notes}` });

    if (rescored.score >= bestScore) {
      bestCode = recompiled.code;
      bestResult = recompiled.result;
      bestScore = rescored.score;
      bestNotes = rescored.notes;
      bestContextQuestion = rescored.contextQuestion;
      bestGasNotes = rescored.gasNotes;
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  if (bestScore >= TARGET_SECURITY_SCORE) {
    bestContextQuestion = null;
  }

  emit({
    phase: "auditing",
    message:
      bestScore >= TARGET_SECURITY_SCORE
        ? `Reached target security score: ${bestScore}/100.`
        : `Stopped after ${hardenAttempt} hardening attempt(s). Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
  });

  if (bestScore < TARGET_SECURITY_SCORE && bestContextQuestion) {
    emit({
      phase: "auditing",
      message: `Providing more detail would improve this recommendation: ${bestContextQuestion}`,
    });
  }

  const testSuiteCode = await generateTestSuiteSafe(bestCode, parent.contractName, "EVM", undefined, emit);

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: bestResult.bytecode,
      abiOrIdl: JSON.stringify(bestResult.abi),
      securityScore: bestScore,
      securityNotes: bestNotes,
      securityContextQuestion: bestContextQuestion,
      compileLog: compileLog.join("\n\n"),
      testSuiteCode,
      gasEstimates: bestResult.gasEstimates ? JSON.stringify(bestResult.gasEstimates) : null,
      gasNotes: bestGasNotes || null,
    })
    .where(eq(contractProjectsTable.id, child.id))
    .returning();

  emit({ phase: "done", project: updated! });
}

async function hardenSolanaOnly(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  emit({
    phase: "auditing",
    message: `Starting a new security-hardening pass on top of "${parent.contractName}"...`,
  });

  let bestCode = parent.smartContractCode!;
  let bestIdl = parent.abiOrIdl ?? "";
  let bestScore = parent.securityScore ?? 0;
  let bestNotes = parent.securityNotes ?? "";
  let bestContextQuestion: string | null = null;
  let bestGasNotes = parent.gasNotes ?? "";
  let bestSo: string | null = parent.compiledBytecode ?? null;
  let toolchainUnavailable = false;

  if (parent.securityScore === null) {
    emit({ phase: "auditing", message: "Running LLM security audit..." });
    const scored = await scoreContractSecurity(bestCode, "SOLANA");
    bestScore = scored.score;
    bestNotes = scored.notes;
    bestContextQuestion = scored.contextQuestion;
    bestGasNotes = scored.gasNotes;
  }

  const compileLog: string[] = [];

  await withTempBuildDir(async (buildDir) => {
  let hardenAttempt = 0;
  while (
    hardenAttempt < MAX_SECURITY_HARDENING_ATTEMPTS &&
    (hardenAttempt === 0 || bestScore < TARGET_SECURITY_SCORE)
  ) {
    hardenAttempt += 1;
    await setStatus(child.id, "hardening");
    emit({
      phase: "hardening",
      message: `Hardening program (attempt ${hardenAttempt}/${MAX_SECURITY_HARDENING_ATTEMPTS}), current score ${bestScore}/100...`,
    });

    let hardened: { code: string; idl: string };
    try {
      hardened = await hardenAnchorContract(
        bestCode,
        bestIdl,
        bestNotes,
        bestScore,
        parent.contractName,
        child.userContext ?? undefined,
      );
    } catch (err) {
      emit({
        phase: "hardening",
        message: `Hardening pass failed to produce valid output (${err instanceof Error ? err.message : "unknown error"}); keeping previous best version.`,
      });
      continue;
    }

    let hardenedSo: string | undefined;
    if (!toolchainUnavailable) {
      const recompiled = await compileAnchorWithSelfHeal(
        hardened.code,
        parent.contractName,
        buildDir,
        emit,
        child.id,
      );
      compileLog.push(...recompiled.log);
      hardened.code = recompiled.code;
      if (recompiled.result.toolchainUnavailable) {
        toolchainUnavailable = true;
        emit({
          phase: "compiling",
          message: "Anchor/cargo toolchain is unavailable in this environment; continuing without a real rebuild.",
        });
      } else if (recompiled.result.success) {
        hardened.idl = recompiled.result.idl ?? hardened.idl;
        hardenedSo = recompiled.result.soBase64;
      } else {
        emit({
          phase: "hardening",
          message: "Hardened program failed to compile even after self-healing; keeping previous best version.",
        });
        continue;
      }
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
      if (hardenedSo) bestSo = hardenedSo;
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  if (bestScore >= TARGET_SECURITY_SCORE) {
    bestContextQuestion = null;
  }

  emit({
    phase: "auditing",
    message:
      bestScore >= TARGET_SECURITY_SCORE
        ? `Reached target security score: ${bestScore}/100.`
        : `Stopped after ${hardenAttempt} hardening attempt(s). Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
  });

  if (bestScore < TARGET_SECURITY_SCORE && bestContextQuestion) {
    emit({
      phase: "auditing",
      message: `Providing more detail would improve this recommendation: ${bestContextQuestion}`,
    });
  }

  const testSuiteCode = await generateTestSuiteSafe(bestCode, parent.contractName, "SOLANA", bestIdl, emit);

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: bestSo,
      abiOrIdl: bestIdl,
      securityScore: bestScore,
      securityNotes: bestNotes,
      securityContextQuestion: bestContextQuestion,
      compileLog: toolchainUnavailable
        ? "Anchor/cargo toolchain unavailable in this environment; hardening proceeded without a real rebuild."
        : compileLog.join("\n\n"),
      testSuiteCode,
      gasNotes: bestGasNotes || null,
    })
    .where(eq(contractProjectsTable.id, child.id))
    .returning();

  emit({ phase: "done", project: updated! });
  }); // end withTempBuildDir
}

async function runSolanaPipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  await setStatus(project.id, "generating");
  emit({
    phase: "generating",
    message: "Generating Anchor (Rust) program and IDL...",
  });

  let bestCode: string;
  let bestIdl: string;
  {
    const template = getTemplate("SOLANA", project.templateId);
    const generated = await generateAnchorContract(
      project.prompt,
      project.contractName,
      template?.promptFragment,
    );
    bestCode = generated.code;
    bestIdl = generated.idl;
  }

  await withTempBuildDir(async (buildDir) => {
    await setStatus(project.id, "compiling");
    emit({ phase: "compiling", message: "Compiling with cargo-build-sbf (Anchor)..." });

    const first = await compileAnchorWithSelfHeal(bestCode, project.contractName, buildDir, emit, project.id);
    const compileLog: string[] = [...first.log];
    bestCode = first.code;

    let bestSo: string | undefined;
    let bestRent: number | undefined;

    if (first.result.toolchainUnavailable) {
      emit({
        phase: "compiling",
        message: "Anchor/cargo toolchain is unavailable in this environment; continuing with generated source only (no real build).",
      });
    } else if (!first.result.success) {
      emit({
        phase: "compiling",
        message: "Compilation failed after self-healing attempts; continuing with the last generated source (unbuilt).",
      });
    } else {
      bestIdl = first.result.idl ?? bestIdl;
      bestSo = first.result.soBase64;
      bestRent = first.result.rentExemptLamports;
      emit({
        phase: "compiling",
        message: `Compilation succeeded: real ${first.result.soSizeBytes} byte .so binary${first.result.idl ? " and real IDL" : ""} produced.`,
      });
    }

    emit({ phase: "auditing", message: "Running LLM security audit..." });
    let { score: bestScore, notes: bestNotes, contextQuestion: bestContextQuestion, gasNotes: bestGasNotes } =
      await scoreContractSecurity(bestCode, "SOLANA");
    emit({
      phase: "auditing",
      message: `Security score: ${bestScore}/100. ${bestNotes}`,
    });

    let hardenAttempt = 0;
    while (bestScore < TARGET_SECURITY_SCORE && hardenAttempt < MAX_SECURITY_HARDENING_ATTEMPTS) {
      hardenAttempt += 1;
      await setStatus(project.id, "hardening");
      emit({
        phase: "hardening",
        message: `Security score ${bestScore}/100 is below the ${TARGET_SECURITY_SCORE} target — hardening program (attempt ${hardenAttempt}/${MAX_SECURITY_HARDENING_ATTEMPTS})...`,
      });

      let hardened: { code: string; idl: string };
      try {
        hardened = await hardenAnchorContract(
          bestCode,
          bestIdl,
          bestNotes,
          bestScore,
          project.contractName,
          project.userContext ?? undefined,
        );
      } catch (err) {
        emit({
          phase: "hardening",
          message: `Hardening pass failed to produce valid output (${err instanceof Error ? err.message : "unknown error"}); keeping previous best version.`,
        });
        continue;
      }

      let hardenedSo: string | undefined;
      let hardenedRent: number | undefined;
      if (!first.result.toolchainUnavailable) {
        const recompiled = await compileAnchorWithSelfHeal(
          hardened.code,
          project.contractName,
          buildDir,
          emit,
          project.id,
        );
        compileLog.push(...recompiled.log);
        hardened.code = recompiled.code;
        if (recompiled.result.success) {
          hardened.idl = recompiled.result.idl ?? hardened.idl;
          hardenedSo = recompiled.result.soBase64;
          hardenedRent = recompiled.result.rentExemptLamports;
        } else {
          emit({
            phase: "hardening",
            message: "Hardened program failed to compile even after self-healing; keeping previous best version.",
          });
          continue;
        }
      }

      emit({ phase: "auditing", message: "Re-auditing hardened program..." });
      const rescored = await scoreContractSecurity(hardened.code, "SOLANA");
      emit({
        phase: "auditing",
        message: `Security score: ${rescored.score}/100. ${rescored.notes}`,
      });

      if (rescored.score >= bestScore) {
        bestCode = hardened.code;
        bestIdl = hardened.idl;
        bestScore = rescored.score;
        bestNotes = rescored.notes;
        bestContextQuestion = rescored.contextQuestion;
        bestGasNotes = rescored.gasNotes;
        if (hardenedSo) {
          bestSo = hardenedSo;
          bestRent = hardenedRent;
        }
      } else {
        emit({
          phase: "hardening",
          message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
        });
      }
    }

    if (bestScore >= TARGET_SECURITY_SCORE) {
      bestContextQuestion = null;
      emit({
        phase: "auditing",
        message: `Reached target security score: ${bestScore}/100.`,
      });
    } else {
      emit({
        phase: "auditing",
        message: `Stopped after ${MAX_SECURITY_HARDENING_ATTEMPTS} hardening attempts. Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
      });
      if (bestContextQuestion) {
        emit({
          phase: "auditing",
          message: `Providing more detail would improve this recommendation: ${bestContextQuestion}`,
        });
      }
    }

    const testSuiteCode = await generateTestSuiteSafe(bestCode, project.contractName, "SOLANA", bestIdl, emit);

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
        compileLog: compileLog.join("\n\n"),
        testSuiteCode,
        gasNotes: rentNote ? `${bestGasNotes || ""}\n\n${rentNote}`.trim() : (bestGasNotes || null),
      })
      .where(eq(contractProjectsTable.id, project.id))
      .returning();

    emit({ phase: "done", project: updated! });
  });
}
