import { eq } from "drizzle-orm";
import { db, contractProjectsTable, type ContractProjectRow } from "@workspace/db";
import { compileSolidity } from "./evmCompile";
import {
  generateSolidityContract,
  repairSolidityContract,
  generateAnchorContract,
  scoreContractSecurity,
} from "./llm";

export type ForgeEvent =
  | { phase: string; message: string }
  | { phase: "done"; project: ContractProjectRow }
  | { phase: "error"; message: string };

const MAX_HEAL_ATTEMPTS = 3;

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

  let code = await generateSolidityContract(project.prompt, project.contractName);
  const compileLog: string[] = [];

  await setStatus(project.id, "compiling");
  emit({ phase: "compiling", message: "Compiling with solc..." });

  let result = compileSolidity(project.contractName, code);
  let attempt = 0;

  while (!result.success && attempt < MAX_HEAL_ATTEMPTS) {
    attempt += 1;
    compileLog.push(`Attempt ${attempt} failed:\n${result.errors}`);
    await setStatus(project.id, "healing");
    emit({
      phase: "healing",
      message: `Compile failed, self-healing (attempt ${attempt}/${MAX_HEAL_ATTEMPTS})...`,
    });

    code = await repairSolidityContract(code, result.errors ?? "", project.contractName);

    await setStatus(project.id, "compiling");
    emit({ phase: "compiling", message: "Recompiling patched contract with solc..." });
    result = compileSolidity(project.contractName, code);
  }

  if (!result.success) {
    compileLog.push(`Final attempt failed:\n${result.errors}`);
    await db
      .update(contractProjectsTable)
      .set({
        status: "failed",
        smartContractCode: code,
        compileLog: compileLog.join("\n\n"),
      })
      .where(eq(contractProjectsTable.id, project.id));
    emit({ phase: "error", message: "Compilation failed after self-healing attempts." });
    return;
  }

  compileLog.push("Compilation succeeded.");
  emit({ phase: "compiling", message: "Compilation succeeded." });

  emit({ phase: "auditing", message: "Running LLM security audit..." });
  const { score, notes } = await scoreContractSecurity(code, "EVM");

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: code,
      compiledBytecode: result.bytecode,
      abiOrIdl: JSON.stringify(result.abi),
      securityScore: score,
      securityNotes: notes,
      compileLog: compileLog.join("\n\n"),
    })
    .where(eq(contractProjectsTable.id, project.id))
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

  const { code, idl } = await generateAnchorContract(
    project.prompt,
    project.contractName,
  );

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
  const { score, notes } = await scoreContractSecurity(code, "SOLANA");

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: code,
      compiledBytecode: null,
      abiOrIdl: idl,
      securityScore: score,
      securityNotes: notes,
      compileLog,
    })
    .where(eq(contractProjectsTable.id, project.id))
    .returning();

  emit({ phase: "done", project: updated! });
}
