import { eq } from "drizzle-orm";
import { db, contractProjectsTable, type ContractProjectRow } from "@workspace/db";
import { compileSolidity, type EvmCompileResult } from "./evmCompile";
import {
  generateSolidityContract,
  repairSolidityContract,
  generateAnchorContract,
  scoreContractSecurity,
  hardenSolidityContract,
  hardenAnchorContract,
} from "./llm";

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
  emit({ phase: "generating", message: "Generating Solidity contract with Claude..." });

  const initialCode = await generateSolidityContract(project.prompt, project.contractName);
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
  let { score: bestScore, notes: bestNotes } = await scoreContractSecurity(bestCode, "EVM");
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
    const rescored = await scoreContractSecurity(recompiled.code, "EVM");
    emit({
      phase: "auditing",
      message: `Security score: ${rescored.score}/100. ${rescored.notes}`,
    });

    if (rescored.score >= bestScore) {
      bestCode = recompiled.code;
      bestResult = recompiled.result;
      bestScore = rescored.score;
      bestNotes = rescored.notes;
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  if (bestScore >= TARGET_SECURITY_SCORE) {
    emit({
      phase: "auditing",
      message: `Reached target security score: ${bestScore}/100.`,
    });
  } else {
    emit({
      phase: "auditing",
      message: `Stopped after ${MAX_SECURITY_HARDENING_ATTEMPTS} hardening attempts. Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
    });
  }

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: bestResult.bytecode,
      abiOrIdl: JSON.stringify(bestResult.abi),
      securityScore: bestScore,
      securityNotes: bestNotes,
      compileLog: compileLog.join("\n\n"),
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

  if (parent.securityScore === null) {
    emit({ phase: "auditing", message: "Running LLM security audit..." });
    const scored = await scoreContractSecurity(bestCode, "EVM");
    bestScore = scored.score;
    bestNotes = scored.notes;
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

    const hardenedCode = await hardenSolidityContract(bestCode, bestNotes, bestScore, parent.contractName);
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
    const rescored = await scoreContractSecurity(recompiled.code, "EVM");
    emit({ phase: "auditing", message: `Security score: ${rescored.score}/100. ${rescored.notes}` });

    if (rescored.score >= bestScore) {
      bestCode = recompiled.code;
      bestResult = recompiled.result;
      bestScore = rescored.score;
      bestNotes = rescored.notes;
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  emit({
    phase: "auditing",
    message:
      bestScore >= TARGET_SECURITY_SCORE
        ? `Reached target security score: ${bestScore}/100.`
        : `Stopped after ${hardenAttempt} hardening attempt(s). Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
  });

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: bestResult.bytecode,
      abiOrIdl: JSON.stringify(bestResult.abi),
      securityScore: bestScore,
      securityNotes: bestNotes,
      compileLog: compileLog.join("\n\n"),
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

  if (parent.securityScore === null) {
    emit({ phase: "auditing", message: "Running LLM security audit..." });
    const scored = await scoreContractSecurity(bestCode, "SOLANA");
    bestScore = scored.score;
    bestNotes = scored.notes;
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
      message: `Hardening program (attempt ${hardenAttempt}/${MAX_SECURITY_HARDENING_ATTEMPTS}), current score ${bestScore}/100...`,
    });

    let hardened: { code: string; idl: string };
    try {
      hardened = await hardenAnchorContract(bestCode, bestIdl, bestNotes, bestScore, parent.contractName);
    } catch (err) {
      emit({
        phase: "hardening",
        message: `Hardening pass failed to produce valid output (${err instanceof Error ? err.message : "unknown error"}); keeping previous best version.`,
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
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  emit({
    phase: "auditing",
    message:
      bestScore >= TARGET_SECURITY_SCORE
        ? `Reached target security score: ${bestScore}/100.`
        : `Stopped after ${hardenAttempt} hardening attempt(s). Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
  });

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: null,
      abiOrIdl: bestIdl,
      securityScore: bestScore,
      securityNotes: bestNotes,
      compileLog: "Simulated build: Anchor/cargo toolchain unavailable in this environment.",
    })
    .where(eq(contractProjectsTable.id, child.id))
    .returning();

  emit({ phase: "done", project: updated! });
}

async function runSolanaPipeline(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
) {
  await setStatus(project.id, "generating");
  emit({
    phase: "generating",
    message: "Generating Anchor (Rust) program and IDL with Claude...",
  });

  let bestCode: string;
  let bestIdl: string;
  {
    const generated = await generateAnchorContract(project.prompt, project.contractName);
    bestCode = generated.code;
    bestIdl = generated.idl;
  }

  await setStatus(project.id, "compiling");
  emit({
    phase: "compiling",
    message: "Simulating Anchor build (no cargo/Anchor toolchain in this environment)...",
  });

  // No cargo/Anchor toolchain is installed, so compilation is honestly simulated:
  // real code + a real LLM-authored IDL are produced and persisted, but no .so
  // binary is actually built.
  const compileLog = "Simulated build: Anchor/cargo toolchain unavailable in this environment. Rust source and IDL were generated but not compiled to a .so binary.";

  emit({ phase: "auditing", message: "Running LLM security audit..." });
  let { score: bestScore, notes: bestNotes } = await scoreContractSecurity(bestCode, "SOLANA");
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
      );
    } catch (err) {
      emit({
        phase: "hardening",
        message: `Hardening pass failed to produce valid output (${err instanceof Error ? err.message : "unknown error"}); keeping previous best version.`,
      });
      continue;
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
    } else {
      emit({
        phase: "hardening",
        message: `Hardening attempt regressed the score (${rescored.score}/100 < ${bestScore}/100); keeping previous best version.`,
      });
    }
  }

  if (bestScore >= TARGET_SECURITY_SCORE) {
    emit({
      phase: "auditing",
      message: `Reached target security score: ${bestScore}/100.`,
    });
  } else {
    emit({
      phase: "auditing",
      message: `Stopped after ${MAX_SECURITY_HARDENING_ATTEMPTS} hardening attempts. Best achieved: ${bestScore}/100 (target ${TARGET_SECURITY_SCORE}).`,
    });
  }

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: bestCode,
      compiledBytecode: null,
      abiOrIdl: bestIdl,
      securityScore: bestScore,
      securityNotes: bestNotes,
      compileLog,
    })
    .where(eq(contractProjectsTable.id, project.id))
    .returning();

  emit({ phase: "done", project: updated! });
}
