/**
 * AURA Forge — EVM AI Agent
 *
 * A true ReAct (Reason + Act) agent that drives smart-contract development
 * using Claude's native tool-use API.  Unlike the old scripted pipeline the
 * agent decides at every step what to do next: write code, compile, run
 * Slither, fetch an EIP, audit security, surgically patch a single function,
 * or declare done.  This produces higher-quality contracts because the model
 * reasons about its own findings rather than following a fixed recipe.
 *
 * Features implemented here:
 *   1. Planning phase  — structured plan before any code is written
 *   2. TDD            — generate_tests can be called before write_contract
 *   3. ReAct loop     — compile → slither → audit → patch/rewrite → repeat
 *   4. Function-level surgery — patch_function replaces one function only
 *   5. EIP lookup     — fetch_eip retrieves live spec text
 *   6. Agent memory   — per-step scratchpad persisted in the DB
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";

// Local type aliases that mirror the Anthropic SDK shapes we use — avoids
// importing @anthropic-ai/sdk directly as a devDependency.
type AnthropicTool = Parameters<typeof anthropic.messages.create>[0]["tools"] extends
  ReadonlyArray<infer T> | undefined ? T : never;
type AnthropicMessageParam = Parameters<typeof anthropic.messages.create>[0]["messages"][number];
type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};
import { eq } from "drizzle-orm";
import { db, contractProjectsTable, type ContractProjectRow } from "@workspace/db";
import { compileSolidity, type EvmCompileResult } from "./evmCompile";
import { runSlither } from "./slitherAnalysis";
import { runFoundryTests } from "./foundryRunner";
import { runHalmosVerification } from "./formalVerification";
import { scoreContractSecurity } from "./llm";
import { fetchEipSpec } from "./eipLookup";
import { getTemplate, UPGRADEABLE_EVM_FRAGMENT } from "./templates";
import type { ForgeEvent } from "./pipeline";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5";
const MAX_AGENT_STEPS = 18;    // hard ceiling on tool calls
const TARGET_SCORE = 95;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvmPlan {
  summary: string;
  applicable_standards: string[];
  eips_to_check: number[];
  security_properties: string[];
  attack_vectors: string[];
  test_requirements: string[];
  approach: string;
}

export interface AgentNote {
  step: number;
  action: string;
  detail: string;
  outcome: string;
}

/**
 * Context passed to `runEvmAgent` when performing a harden-only re-run.
 * The agent pre-seeds its state with the parent project's code, score, notes,
 * and prior scratchpad so it knows what was already tried.
 */
export interface HardenContext {
  /** Existing contract source to start hardening from */
  code: string;
  /** Security score from the parent project's last audit */
  securityScore: number;
  /** Audit notes from the parent project's last audit */
  securityNotes: string;
  /** Prior agent scratchpad steps from the parent project (may be empty) */
  agentNotes: AgentNote[];
  /**
   * Whether the parent contract uses the UUPS upgradeable pattern.
   * Must be copied from the parent, not the child, so audit_security and the
   * system prompt apply the correct upgradeability requirements.
   */
  upgradeable: boolean;
}

interface AgentState {
  code: string | null;
  compiledResult: EvmCompileResult | null;
  slitherFindings: string;
  securityScore: number;
  securityNotes: string;
  contextQuestion: string | null;
  gasNotes: string;
  tests: string | null;
  scratchpad: AgentNote[];
  compileLog: string[];
  finished: boolean;
  finishReason: string;
}

// ─── Tool definitions (Claude tool-use schema) ────────────────────────────────

const AGENT_TOOLS: AnthropicTool[] = [
  {
    name: "write_contract",
    description:
      "Write or completely rewrite the Solidity contract. " +
      "In TDD mode, call generate_tests FIRST so you commit to a behaviour spec before writing code.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "Complete Solidity source code (no external imports, no constructor args, pragma ^0.8.24)",
        },
        rationale: {
          type: "string",
          description: "Why you wrote it this way — standards used, patterns chosen, security decisions made",
        },
      },
      required: ["code", "rationale"],
    },
  },
  {
    name: "compile",
    description:
      "Compile the current contract with solc. " +
      "Always compile after write_contract or patch_function. " +
      "Returns 'success' with ABI and gas estimates, or compiler errors.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "run_slither",
    description:
      "Run Slither static analysis on the current compiled contract. " +
      "Returns High/Medium findings or 'no findings'. " +
      "Only useful after a successful compile.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "fetch_eip",
    description:
      "Fetch the live specification for an Ethereum Improvement Proposal. " +
      "Call this BEFORE writing code when your plan lists applicable EIPs so you can match the spec exactly.",
    input_schema: {
      type: "object" as const,
      properties: {
        eip_number: {
          type: "number",
          description: "The EIP number (e.g. 20 for ERC-20, 721 for ERC-721, 2612 for permit)",
        },
      },
      required: ["eip_number"],
    },
  },
  {
    name: "audit_security",
    description:
      "Run a full LLM security audit and score the current contract (0–100). " +
      "Use after compile to understand what to fix. " +
      "Target score is 95.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "patch_function",
    description:
      "Surgically replace ONE function in the contract without rewriting the whole file. " +
      "Use this for targeted fixes after auditing — it is faster and less likely to regress other functions. " +
      "After patching, always call compile to verify the patch is syntactically valid.",
    input_schema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Exact name of the function to replace",
        },
        issue: {
          type: "string",
          description: "The security or correctness problem in this function",
        },
        new_implementation: {
          type: "string",
          description:
            "Complete new Solidity implementation of ONLY this function " +
            "(full signature + body, properly indented, with closing brace)",
        },
      },
      required: ["function_name", "issue", "new_implementation"],
    },
  },
  {
    name: "generate_tests",
    description:
      "Generate a comprehensive Foundry test suite. " +
      "In TDD mode call this BEFORE write_contract. " +
      "The tests will be run automatically after the contract is finalised.",
    input_schema: {
      type: "object" as const,
      properties: {
        requirements: {
          type: "string",
          description:
            "Comma-separated list of specific behaviours that must be tested (access control, edge cases, invariants)",
        },
      },
    },
  },
  {
    name: "finish",
    description:
      "Declare the contract complete. Call when the security score meets the target (95+), " +
      "or when you have exhausted all realistic improvement options.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          description: "Why you are declaring the contract done",
        },
        final_score: {
          type: "number",
          description: "The security score you achieved",
        },
      },
      required: ["reason", "final_score"],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setStatus(id: number, status: string) {
  await db.update(contractProjectsTable).set({ status }).where(eq(contractProjectsTable.id, id));
}

/**
 * Brace-counting function patcher.  Finds the named function in `code` and
 * replaces it — including any modifier list and return type — with `newImpl`.
 * Falls back to returning the original code if the function cannot be located.
 */
function applyFunctionPatch(code: string, functionName: string, newImpl: string): string {
  const lines = code.split("\n");

  // Find the line where the function starts
  const fnRegex = new RegExp(`\\bfunction\\s+${functionName}\\s*\\(`);
  let fnStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (fnRegex.test(lines[i])) {
      fnStart = i;
      break;
    }
  }
  if (fnStart === -1) return code; // not found — leave unchanged

  // Count braces from fn start to find the matching closing brace
  let depth = 0;
  let fnEnd = -1;
  let seenOpenBrace = false;
  for (let i = fnStart; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") { depth++; seenOpenBrace = true; }
      else if (ch === "}") {
        depth--;
        if (seenOpenBrace && depth === 0) { fnEnd = i; break; }
      }
    }
    if (fnEnd !== -1) break;
  }
  if (fnEnd === -1) return code; // couldn't find end — leave unchanged

  return [
    ...lines.slice(0, fnStart),
    newImpl,
    ...lines.slice(fnEnd + 1),
  ].join("\n");
}

function buildSystemPrompt(project: ContractProjectRow, plan: EvmPlan, isHardenPass = false): string {
  return (
    "You are AURA — an autonomous smart-contract engineer. " +
    (isHardenPass
      ? "Your goal is to surgically improve the security of an existing Solidity contract to reach a score of 95/100 or above. " +
        "The contract code is already loaded — do NOT rewrite from scratch unless absolutely necessary. " +
        "Prefer patch_function for targeted fixes. "
      : "Your goal is to produce a production-quality, secure Solidity contract that scores 95/100 or above in a security audit. ") +
    "You have a set of tools available. Use them in this preferred order: " +
    (isHardenPass
      ? "1. compile (verify the existing code still compiles), " +
        "2. run_slither (static analysis), " +
        "3. audit_security (understand what to fix), " +
        "4. patch_function for targeted fixes (PREFERRED — surgical and safe), " +
        "5. write_contract only if a full rewrite is truly necessary, " +
        "6. compile after every patch or rewrite, " +
        "7. audit_security again to confirm improvement, " +
        "8. finish when score ≥ 95 or options exhausted.\n\n"
      : "1. fetch_eip for any EIP in your plan, " +
        "2. generate_tests (TDD — commit to behaviour before writing code), " +
        "3. write_contract, " +
        "4. compile (always after writing/patching), " +
        "5. audit_security, " +
        "6. patch_function for targeted fixes (preferred over full rewrites), " +
        "7. run_slither after each successful compile, " +
        "8. finish when score ≥ 95 or options exhausted.\n\n") +
    `CONTRACT NAME: ${project.contractName}\n` +
    `SPEC: ${project.prompt}\n` +
    `PLAN SUMMARY: ${plan.summary}\n` +
    `APPLICABLE STANDARDS: ${plan.applicable_standards.join(", ") || "none"}\n` +
    `SECURITY PROPERTIES TO ENFORCE: ${plan.security_properties.join("; ")}\n` +
    `ATTACK VECTORS TO DEFEND: ${plan.attack_vectors.join("; ")}\n` +
    `TEST REQUIREMENTS: ${plan.test_requirements.join("; ")}\n` +
    (project.upgradeable ? "UPGRADEABILITY: This contract must be upgradeable (UUPS proxy pattern). " +
      "Inline all proxy/initializer logic; no OpenZeppelin imports.\n" : "") +
    (project.userContext ? `USER CONTEXT: ${project.userContext}\n` : "") +
    "\nRules: pragma solidity ^0.8.24; no external imports; no constructor arguments; " +
    "contract MUST be named exactly '" + project.contractName + "'. " +
    "Always compile before auditing. Always run Slither after compiling. " +
    "Prefer patch_function over write_contract for fixes — it is surgical and safe."
  );
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export async function planEvmContract(
  prompt: string,
  contractName: string,
  templateFragment?: string,
  upgradeableFragment?: string,
): Promise<EvmPlan> {
  const templateBlock = templateFragment ? `\n\nSTARTING PATTERN: ${templateFragment}` : "";
  const upgradeableBlock = upgradeableFragment
    ? `\n\nThis contract must be upgradeable (UUPS pattern).`
    : "";

  const systemPrompt =
    "You are a senior Solidity architect. Given a contract specification, produce a structured development plan. " +
    "Respond with ONLY a valid JSON object (no markdown fences, no prose): " +
    '{"summary":"<one sentence>","applicable_standards":["ERC-20",...],"eips_to_check":[20,...],' +
    '"security_properties":["<invariant>",...],"attack_vectors":["<attack>",...],' +
    '"test_requirements":["<specific test case>",...],"approach":"<brief description>"}';

  const userMsg =
    `Plan the development of a Solidity contract named "${contractName}" ` +
    `that implements: ${prompt}${templateBlock}${upgradeableBlock}`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMsg }],
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Planner returned no text");

  // Strip any accidental fences
  let raw = block.text.trim();
  const fenceMatch = raw.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  try {
    return JSON.parse(raw) as EvmPlan;
  } catch {
    // Best-effort fallback plan
    return {
      summary: `Implement ${contractName}: ${prompt.slice(0, 100)}`,
      applicable_standards: [],
      eips_to_check: [],
      security_properties: ["No reentrancy", "Proper access control", "Integer safety"],
      attack_vectors: ["Reentrancy", "Unauthorized access", "Integer overflow"],
      test_requirements: ["Test main functions", "Test access control", "Test edge cases"],
      approach: "Write safe, audited Solidity with checks-effects-interactions pattern",
    };
  }
}

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  state: AgentState,
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
): Promise<string> {
  switch (toolName) {
    // ── write_contract ────────────────────────────────────────────────────────
    case "write_contract": {
      const code = String(input.code ?? "").trim();
      const rationale = String(input.rationale ?? "");
      state.code = code;
      state.compiledResult = null; // invalidate old compile result
      emit({ phase: "generating", message: `Writing contract — ${rationale.slice(0, 120)}` });
      addNote(state, "write_contract", rationale, "contract code set");
      return "Contract code has been set. Next: call compile to verify it compiles.";
    }

    // ── compile ───────────────────────────────────────────────────────────────
    case "compile": {
      if (!state.code) return "ERROR: No contract code yet. Call write_contract first.";

      await setStatus(project.id, "compiling");
      emit({ phase: "compiling", message: "Compiling with solc..." });

      const result = compileSolidity(project.contractName, state.code);
      state.compiledResult = result;

      if (result.success) {
        state.compileLog.push("Compile succeeded.");
        emit({ phase: "compiling", message: "Compilation succeeded." });
        addNote(state, "compile", "compile attempt", "success");
        return (
          `SUCCESS. Contract compiled. ABI has ${result.abi?.length ?? 0} entries. ` +
          (result.gasEstimates?.length
            ? `Gas estimates: ${result.gasEstimates.map((g) => `${g.functionSignature}=${g.gas}`).join(", ")}.`
            : "") +
          " Next: call run_slither, then audit_security."
        );
      } else {
        state.compileLog.push(`Compile failed:\n${result.errors}`);
        emit({ phase: "compiling", message: `Compile failed: ${result.errors?.slice(0, 200)}` });
        addNote(state, "compile", "compile attempt", `failed: ${result.errors?.slice(0, 100)}`);
        return `FAILED. Compiler errors:\n${result.errors}\n\nFix these with patch_function or write_contract.`;
      }
    }

    // ── run_slither ───────────────────────────────────────────────────────────
    case "run_slither": {
      if (!state.compiledResult?.success) {
        return "Slither requires a successful compilation first. Call compile.";
      }

      emit({ phase: "auditing", message: "Running Slither static analysis..." });
      const slither = await runSlither(state.code!, project.contractName);

      if (!slither.available) {
        state.slitherFindings = "";
        emit({ phase: "auditing", message: "Slither not installed — skipping static analysis." });
        return "Slither is not installed in this environment. Proceed with audit_security (LLM-only).";
      }

      state.slitherFindings = slither.formattedForLlm;
      const hi = slither.findings.filter((f) => f.impact === "High").length;
      const md = slither.findings.filter((f) => f.impact === "Medium").length;
      const summary =
        slither.findings.length > 0
          ? `${slither.findings.length} finding(s): ${hi} High, ${md} Medium.`
          : "No high/medium findings.";
      emit({ phase: "auditing", message: `Slither: ${summary}` });
      addNote(state, "run_slither", "static analysis", summary);

      return slither.findings.length > 0
        ? `FINDINGS:\n${slither.formattedForLlm}\n\nAddress these before calling finish.`
        : "No High/Medium findings. Proceed to audit_security.";
    }

    // ── fetch_eip ─────────────────────────────────────────────────────────────
    case "fetch_eip": {
      const eipNum = Number(input.eip_number ?? 0);
      if (!eipNum) return "ERROR: eip_number must be a positive integer.";
      emit({ phase: "generating", message: `Fetching EIP-${eipNum} specification...` });
      const eip = await fetchEipSpec(eipNum);
      addNote(state, "fetch_eip", `EIP-${eipNum}`, eip.found ? "fetched" : "not found");
      return eip.found
        ? `EIP-${eipNum} SPECIFICATION:\n\n${eip.content}`
        : eip.content;
    }

    // ── audit_security ────────────────────────────────────────────────────────
    case "audit_security": {
      if (!state.compiledResult?.success) {
        return "Audit requires a successfully compiled contract. Call compile first.";
      }

      await setStatus(project.id, "auditing");
      emit({ phase: "auditing", message: "Running LLM security audit..." });

      const scored = await scoreContractSecurity(
        state.code!,
        "EVM",
        project.upgradeable,
        state.compiledResult.gasEstimates,
      );

      state.securityScore = scored.score;
      state.securityNotes = scored.notes;
      state.contextQuestion = scored.contextQuestion;
      state.gasNotes = scored.gasNotes;

      emit({
        phase: "auditing",
        message: `Security score: ${scored.score}/100. ${scored.notes}`,
      });
      addNote(
        state,
        "audit_security",
        "LLM audit",
        `score=${scored.score} notes=${scored.notes.slice(0, 100)}`,
      );

      const combined = state.slitherFindings
        ? `AUDIT NOTES: ${scored.notes}\n\nSLITHER FINDINGS:\n${state.slitherFindings}`
        : `AUDIT NOTES: ${scored.notes}`;

      if (scored.score >= TARGET_SCORE) {
        return (
          `Score: ${scored.score}/100 — TARGET REACHED (${TARGET_SCORE}). ` +
          "Call generate_tests if not done, then finish."
        );
      }

      return (
        `Score: ${scored.score}/100 — below target (${TARGET_SCORE}).\n\n${combined}\n\n` +
        (scored.contextQuestion ? `CONTEXT QUESTION: ${scored.contextQuestion}\n\n` : "") +
        "Use patch_function to fix the most critical issues, then compile and audit again."
      );
    }

    // ── patch_function ────────────────────────────────────────────────────────
    case "patch_function": {
      const fnName = String(input.function_name ?? "").trim();
      const issue = String(input.issue ?? "");
      const newImpl = String(input.new_implementation ?? "").trim();

      if (!fnName || !newImpl) {
        return "ERROR: function_name and new_implementation are required.";
      }
      if (!state.code) {
        return "ERROR: No contract code yet. Call write_contract first.";
      }

      const patched = applyFunctionPatch(state.code, fnName, newImpl);
      if (patched === state.code) {
        return (
          `WARNING: Function '${fnName}' was not found in the current code. ` +
          "Check the exact function name and try again, or use write_contract for a full rewrite."
        );
      }

      state.code = patched;
      state.compiledResult = null; // invalidate — must recompile
      emit({
        phase: "hardening",
        message: `Patching ${fnName}() — ${issue.slice(0, 100)}`,
      });
      addNote(state, "patch_function", `fn=${fnName} issue=${issue}`, "patch applied");
      return (
        `Patch applied to ${fnName}(). The old compile result is now invalidated. ` +
        "Call compile to verify the patch is syntactically valid."
      );
    }

    // ── generate_tests ────────────────────────────────────────────────────────
    case "generate_tests": {
      const requirements = String(input.requirements ?? "");

      // Tests can be generated even before the contract is written (TDD mode).
      const sourceForTests = state.code ?? `// Contract not yet written. Requirements: ${project.prompt}`;
      emit({ phase: "testing", message: "Generating Foundry test suite..." });

      try {
        // Inline a targeted test-generation call that knows about TDD requirements
        const { generateTestSuite } = await import("./llm");
        const tests = await generateTestSuite(
          sourceForTests,
          project.contractName,
          "EVM",
          undefined,
          requirements || undefined,
        );
        state.tests = tests;
        addNote(state, "generate_tests", requirements || "default requirements", "tests generated");
        emit({ phase: "testing", message: "Test suite generated." });
        return (
          `Test suite generated (${tests.split("\n").length} lines). ` +
          (state.code ? "Tests will run after finish." : "Now call write_contract to implement the contract.")
        );
      } catch (err) {
        return `Test generation failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ── finish ────────────────────────────────────────────────────────────────
    case "finish": {
      const reason = String(input.reason ?? "");
      const finalScore = Number(input.final_score ?? state.securityScore);

      state.finished = true;
      state.finishReason = reason;
      state.securityScore = finalScore;

      if (finalScore >= TARGET_SCORE) {
        emit({ phase: "auditing", message: `Reached target security score: ${finalScore}/100.` });
      } else {
        emit({
          phase: "auditing",
          message: `Agent finished. Best achieved: ${finalScore}/100 (target ${TARGET_SCORE}). ${reason}`,
        });
        if (state.contextQuestion) {
          emit({
            phase: "auditing",
            message: `Providing more detail would improve the score: ${state.contextQuestion}`,
          });
        }
      }
      return "DONE";
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

function addNote(state: AgentState, action: string, detail: string, outcome: string) {
  state.scratchpad.push({ step: state.scratchpad.length + 1, action, detail, outcome });
}

// ─── Main agent entry point ───────────────────────────────────────────────────

export async function runEvmAgent(
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
  hardenContext?: HardenContext,
): Promise<void> {
  await setStatus(project.id, "generating");

  // ── 1. Planning phase ──────────────────────────────────────────────────────
  let plan: EvmPlan;

  if (hardenContext) {
    // For harden-only runs, build a focused security-improvement plan without
    // calling the LLM planner — we already know what the contract does.
    emit({ phase: "auditing", message: "Agent preparing security-hardening pass..." });
    plan = {
      summary: `Harden the security of the existing ${project.contractName} contract`,
      applicable_standards: [],
      eips_to_check: [],
      security_properties: ["No reentrancy", "Proper access control", "Integer safety", "Input validation"],
      attack_vectors: ["Reentrancy", "Unauthorized access", "Integer overflow", "Flash loan attacks"],
      test_requirements: ["Test patched functions", "Test access control", "Test edge cases"],
      approach: "Surgically fix identified security issues using patch_function without rewriting the whole contract",
    };
  } else {
    emit({ phase: "generating", message: "Agent planning contract architecture..." });
    const template = getTemplate("EVM", project.templateId ?? undefined);
    plan = await planEvmContract(
      project.prompt,
      project.contractName,
      template?.promptFragment,
      project.upgradeable ? UPGRADEABLE_EVM_FRAGMENT : undefined,
    );
    emit({
      phase: "generating",
      message:
        `Plan: ${plan.summary} | Standards: ${plan.applicable_standards.join(", ") || "none"} | ` +
        `Attack vectors: ${plan.attack_vectors.slice(0, 3).join(", ")}`,
    });
  }

  // Persist the plan
  await db
    .update(contractProjectsTable)
    .set({ agentPlan: JSON.stringify(plan) })
    .where(eq(contractProjectsTable.id, project.id));

  // ── 2. Effective project — preserve parent configuration for harden passes ──
  // For harden-only runs the `project` row is the freshly-created child, which
  // may not carry fields like `upgradeable` that were set on the parent.
  // We create a merged view so audit_security, the system prompt, and any other
  // code that reads `project.*` use the correct parent values.
  const effectiveProject = hardenContext
    ? { ...project, upgradeable: hardenContext.upgradeable }
    : project;

  // ── 3. Initialize agent state ──────────────────────────────────────────────
  // When hardening, pre-seed state with the parent project's code and audit
  // results so the agent can observe the current baseline immediately.
  // The parent's prior scratchpad is prepended so the agent knows what has
  // already been tried (offset step numbers to keep them contiguous).
  const priorNotes: AgentNote[] = hardenContext
    ? hardenContext.agentNotes.map((n, i) => ({ ...n, step: i + 1 }))
    : [];

  const state: AgentState = {
    code: hardenContext?.code ?? null,
    compiledResult: null, // always start without a cached compile — agent will re-verify
    slitherFindings: "",
    securityScore: hardenContext?.securityScore ?? 0,
    securityNotes: hardenContext?.securityNotes ?? "",
    contextQuestion: null,
    gasNotes: "",
    tests: null,
    scratchpad: priorNotes,
    compileLog: [],
    finished: false,
    finishReason: "",
  };

  // ── 4. Build initial conversation ──────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(effectiveProject, plan, !!hardenContext);

  let initialUserMsg: string;
  if (hardenContext) {
    const priorHistory =
      hardenContext.agentNotes.length > 0
        ? `\n\nPrevious agent history (${hardenContext.agentNotes.length} step(s) already completed by an earlier run):\n` +
          hardenContext.agentNotes
            .map((n) => `  Step ${n.step}: [${n.action}] ${n.detail} → ${n.outcome}`)
            .join("\n")
        : "";

    // Include the full source so the model can read exact function signatures
    // and bodies before deciding which functions to patch.
    initialUserMsg =
      `You are performing a security-hardening pass on the existing ${effectiveProject.contractName} contract. ` +
      `The contract currently scores ${hardenContext.securityScore}/100. ` +
      `Known issues from the last audit: ${hardenContext.securityNotes}` +
      priorHistory +
      `\n\nHere is the current contract source code:\n` +
      "```solidity\n" + hardenContext.code + "\n```\n\n" +
      `The contract code is loaded and ready. ` +
      `Start by calling compile to confirm it still compiles, then run_slither and audit_security ` +
      `to understand the current state. Use patch_function for targeted fixes — you have the full ` +
      `source above so you can copy exact function signatures. ` +
      `Goal: reach a security score of ${TARGET_SCORE} or above.`;
  } else {
    initialUserMsg =
      `Begin implementing the ${effectiveProject.contractName} contract. ` +
      (plan.eips_to_check.length > 0
        ? `Start by fetching EIP(s) ${plan.eips_to_check.join(", ")} to verify you implement the standards correctly. `
        : "") +
      "Then generate tests (TDD), write the contract, compile, run Slither, audit, and iterate until score ≥ 95.";
  }

  const messages: AnthropicMessageParam[] = [
    { role: "user", content: initialUserMsg },
  ];

  // ── 5. ReAct agent loop ────────────────────────────────────────────────────
  let stepCount = 0;

  while (!state.finished && stepCount < MAX_AGENT_STEPS) {
    stepCount++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    });

    // Add the assistant's response to the conversation history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Model chose to stop without calling finish — treat as done
      emit({ phase: "auditing", message: "Agent completed reasoning." });
      state.finished = true;
      break;
    }

    if (response.stop_reason !== "tool_use") {
      // Unexpected stop reason — exit gracefully
      break;
    }

    // Process all tool_use blocks in this response
    const toolResults: AnthropicToolResultBlock[] = [];

    for (const block of response.content) {
      // Emit any between-tool reasoning text so the client can show the
      // agent's thought process in real time.
      if (block.type === "text") {
        const text = block.text.trim();
        if (text) emit({ phase: "reasoning", message: text });
        continue;
      }

      if (block.type !== "tool_use") continue;

      // Pass effectiveProject so audit_security and other tools use the
      // correct upgradeable flag (from the parent, not the fresh child row).
      const result = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        state,
        effectiveProject,
        emit,
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });

      if (state.finished) break; // finish was called
    }

    // Add tool results to the conversation so the agent can observe them
    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }
  }

  if (stepCount >= MAX_AGENT_STEPS && !state.finished) {
    emit({
      phase: "auditing",
      message: `Agent reached maximum steps (${MAX_AGENT_STEPS}). Saving best result so far.`,
    });
  }

  // ── 6. Ensure we have compiled code to save ────────────────────────────────
  // If the agent never successfully compiled, try one final compile.
  if (state.code && !state.compiledResult?.success) {
    emit({ phase: "compiling", message: "Final compile pass..." });
    state.compiledResult = compileSolidity(effectiveProject.contractName, state.code);
    if (state.compiledResult.success) {
      emit({ phase: "compiling", message: "Final compile succeeded." });
    }
  }

  if (!state.code || !state.compiledResult?.success) {
    await db
      .update(contractProjectsTable)
      .set({
        status: "failed",
        smartContractCode: state.code,
        compileLog: state.compileLog.join("\n\n") || "Agent did not produce compilable code.",
        agentNotes: JSON.stringify(state.scratchpad),
      })
      .where(eq(contractProjectsTable.id, project.id));
    emit({ phase: "error", message: "Agent did not produce a compilable contract." });
    return;
  }

  // ── 7. Generate tests if the agent didn't (fallback) ──────────────────────
  if (!state.tests) {
    emit({ phase: "testing", message: "Generating test suite..." });
    try {
      const { generateTestSuite } = await import("./llm");
      state.tests = await generateTestSuite(state.code, effectiveProject.contractName, "EVM");
      emit({ phase: "testing", message: "Test suite generated." });
    } catch {
      emit({ phase: "testing", message: "Test suite generation skipped." });
    }
  }

  // ── 8. Foundry + Halmos (non-blocking, fire-and-forget) ───────────────────
  if (state.tests) {
    runFoundryTests(state.code, state.tests, effectiveProject.contractName)
      .then((fr) => emit({ phase: "testing", message: fr.formattedSummary }))
      .catch(() => {});

    runHalmosVerification(state.code, state.tests, effectiveProject.contractName)
      .then((fv) => { if (fv.available) emit({ phase: "verification", message: fv.summary }); })
      .catch(() => {});
  }

  // ── 8. Persist final result ────────────────────────────────────────────────
  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      status: "success",
      smartContractCode: state.code,
      compiledBytecode: state.compiledResult.bytecode,
      abiOrIdl: JSON.stringify(state.compiledResult.abi),
      securityScore: state.securityScore,
      securityNotes: state.securityNotes,
      securityContextQuestion: state.securityScore >= TARGET_SCORE ? null : state.contextQuestion,
      compileLog: state.compileLog.join("\n\n"),
      testSuiteCode: state.tests,
      gasEstimates: state.compiledResult.gasEstimates
        ? JSON.stringify(state.compiledResult.gasEstimates)
        : null,
      gasNotes: state.gasNotes || null,
      agentNotes: JSON.stringify(state.scratchpad),
      agentPlan: JSON.stringify(plan),
    })
    .where(eq(contractProjectsTable.id, project.id))
    .returning();

  emit({ phase: "done", project: updated! });
}
