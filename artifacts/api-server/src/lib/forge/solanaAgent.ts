/**
 * AURA Forge — Solana "Improve Security" Agent
 *
 * A ReAct-style agent loop that drives the Solana/Anchor security-hardening
 * pass using Claude's native tool-use API.  Unlike the EVM agent there is NO
 * compile tool inside the loop — cargo-build-sbf takes 4–7 minutes per run, so
 * we keep the loop LLM-only and do exactly ONE final cargo compile once the
 * agent declares it is done.
 *
 * Tools available to the agent:
 *   write_program    — write or completely rewrite the Anchor Rust program
 *   patch_function   — surgically replace a single Rust function
 *   audit_security   — run an LLM security audit (SOLANA ecosystem, 0–100 score)
 *   finish           — declare the pass complete
 *
 * Clippy findings (if available) are pre-seeded in the opening user message
 * so the agent can act on them immediately without needing a compile step.
 *
 * Correctness guarantees:
 *   - A "best snapshot" (bestCode / bestScore / bestNotes …) is maintained
 *     separately from the working copy.  audit_security only promotes the
 *     working copy to best when the new score is ≥ the previous best.
 *   - The agent cannot self-report a score via `finish`; the persisted score
 *     always comes from the last call to scoreContractSecurity on the exact
 *     source being saved.
 *   - `finish` is rejected if the current source has not been audited since
 *     the last write_program / patch_function call.
 *   - The returned `bestCode` is always the version that achieved `bestScore`,
 *     not necessarily the most recently modified working copy.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";

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
import { scoreContractSecurity } from "./llm";
import type { ForgeEvent } from "./pipeline";
import type { AgentNote } from "./evmAgent";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5";
const MAX_AGENT_STEPS = 14;   // lower than EVM — no compile steps to burn budget
const TARGET_SCORE = 85;      // Rust/Anchor programs start higher; match pipeline constant

// ─── Agent state ──────────────────────────────────────────────────────────────

interface SolanaAgentState {
  /**
   * Working copy of the program source.  May differ from `bestCode` when the
   * agent has applied a patch/rewrite that has not yet been audited.
   */
  code: string;
  idl: string;

  /**
   * Best snapshot — promoted when audit_security confirms the working copy
   * improves on the current best.  The FIRST audit always promotes regardless
   * of score comparison — it establishes the authoritative fresh baseline.
   * This is what the caller receives back and ultimately persists.
   */
  bestCode: string;
  bestIdl: string;
  bestScore: number;
  bestNotes: string;
  bestContextQuestion: string | null;
  bestGasNotes: string;

  /**
   * False until the first audit_security call in this session completes.
   * The first audit always promotes unconditionally — it establishes the real
   * baseline even when the fresh score is lower than the stored parent score.
   */
  baselineEstablished: boolean;

  /**
   * The value of `code` at the time of the most recent audit_security call.
   * Used to detect un-audited mutations and block premature `finish` calls.
   * Null until the first audit is performed in this session.
   */
  lastAuditedCode: string | null;

  scratchpad: AgentNote[];
  finished: boolean;
  finishReason: string;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const SOLANA_AGENT_TOOLS: AnthropicTool[] = [
  {
    name: "write_program",
    description:
      "Write or completely rewrite the Anchor Rust program. " +
      "Use ONLY when patch_function cannot address the issue — surgical patches are preferred. " +
      "Preserve the IDL-compatible instruction/account structure unless the issue requires structural changes. " +
      "You MUST call audit_security after every write_program before calling finish.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "Complete Anchor Rust program source (lib.rs contents)",
        },
        rationale: {
          type: "string",
          description: "Why a full rewrite is necessary and what security improvements were made",
        },
      },
      required: ["code", "rationale"],
    },
  },
  {
    name: "patch_function",
    description:
      "Surgically replace ONE Rust function in the program without rewriting the whole file. " +
      "This is the PREFERRED tool for targeted security fixes — it is fast, safe, and easy to review. " +
      "Provide the exact function name and a complete new implementation including the full signature and body. " +
      "You MUST call audit_security after every patch_function before calling finish.",
    input_schema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Exact name of the Rust function to replace (without the `fn` keyword)",
        },
        issue: {
          type: "string",
          description: "The security or correctness problem being fixed",
        },
        new_implementation: {
          type: "string",
          description:
            "Complete new Rust implementation of ONLY this function " +
            "(full signature + body, including attributes like #[access_control], properly indented, with closing brace)",
        },
      },
      required: ["function_name", "issue", "new_implementation"],
    },
  },
  {
    name: "audit_security",
    description:
      "Run a full LLM security audit and score the current program (0–100). " +
      "Call this after write_program or patch_function to confirm improvement. " +
      "If the score regresses the previous best version is automatically restored. " +
      `Target score is ${TARGET_SCORE}.`,
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "finish",
    description:
      `Declare the hardening pass complete. Call when the security score meets the target (${TARGET_SCORE}+) ` +
      "or when you have exhausted all realistic improvement options. " +
      "You must have called audit_security after your most recent write_program or patch_function — " +
      "finish is rejected if there is an un-audited change.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          description: "Why you are declaring the pass done",
        },
      },
      required: ["reason"],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addNote(state: SolanaAgentState, action: string, detail: string, outcome: string) {
  state.scratchpad.push({ step: state.scratchpad.length + 1, action, detail, outcome });
}

/**
 * Brace-counting function patcher for Rust.  Finds the named function in
 * `code` and replaces it — along with any immediately preceding attribute
 * lines (#[...], including multiline) and doc comments (///) — with `newImpl`.
 * Falls back to returning the original code unchanged if:
 *   - the function cannot be located, or
 *   - brace matching fails (e.g. malformed input).
 *
 * Brace counting uses a state machine that ignores braces inside:
 *   - line comments  // ...
 *   - block comments /* ... * /
 *   - string literals "..." (with escape handling)
 *
 * Attribute collection uses a bracket-balance check: candidate lines above
 * the fn are accepted only when their [ and ( counts balance, ensuring
 * multiline attributes like #[access_control(\n  ...\n)] are included in full.
 */
function applyRustFunctionPatch(code: string, functionName: string, newImpl: string): string {
  const lines = code.split("\n");

  // ── 1. Locate the `fn function_name` line ──────────────────────────────
  const fnRegex = new RegExp(`\\bfn\\s+${functionName}\\s*[<(]`);
  let fnStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (fnRegex.test(lines[i])) { fnStart = i; break; }
  }
  if (fnStart === -1) return code;

  // ── 2. Walk backward to find the start of preceding attributes/docs ────
  // Gather a candidate range by scanning back until we hit a clear boundary
  // (blank line, closing brace, semicolon, or another definition keyword).
  // Then validate that the bracket count across that range is balanced —
  // accepting multiline attributes while rejecting accidentally included code.
  let candidateStart = fnStart;
  for (let i = fnStart - 1; i >= 0; i--) {
    const t = lines[i].trim();
    // Stop at clear boundaries
    if (t === "" || t === "}" || t === "{" || t.endsWith(";")) break;
    // Accept attribute lines and doc comments unconditionally
    if (t.startsWith("#[") || t.startsWith("///") || t.startsWith("//!")) {
      candidateStart = i;
      continue;
    }
    // Check if this line and everything below it up to fnStart is inside an
    // unclosed bracket (depth < 0 means there are more closes than opens in
    // the range i..fnStart-1, which means an opener exists on a line above i).
    // Example: the closing `)]` of a multiline #[access_control(...)] block.
    let depth = 0;
    for (let j = i; j < fnStart; j++) {
      for (const ch of lines[j]) {
        if (ch === "[" || ch === "(") depth++;
        else if (ch === "]" || ch === ")") depth--;
      }
    }
    if (depth < 0) { candidateStart = i; continue; }
    break;
  }

  // Final bracket-balance check: the attribute block must fully close
  // before the fn line or we don't include it (fall back to fnStart).
  let attrBalance = 0;
  for (let j = candidateStart; j < fnStart; j++) {
    for (const ch of lines[j]) {
      if (ch === "[" || ch === "(") attrBalance++;
      else if (ch === "]" || ch === ")") attrBalance--;
    }
  }
  const attrStart = attrBalance === 0 ? candidateStart : fnStart;

  // ── 3. Find the function's closing brace with a Rust-aware state machine ─
  // States: normal | blockComment | stringLit
  // Line comments (//) cause the inner loop to break immediately (no state needed
  // since they always terminate at the end of the physical line).
  type State = "normal" | "blockComment" | "stringLit";
  let state: State = "normal";
  let depth = 0;
  let seenOpenBrace = false;
  let fnEnd = -1;

  outer: for (let i = fnStart; i < lines.length; i++) {
    const line = lines[i];

    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      const next = c + 1 < line.length ? line[c + 1] : "";

      if (state === "blockComment") {
        if (ch === "*" && next === "/") { state = "normal"; c++; }
        continue;
      }
      if (state === "stringLit") {
        if (ch === "\\") { c++; continue; } // escape sequence
        if (ch === '"') state = "normal";
        continue;
      }

      // state === "normal"
      if (ch === "/" && next === "/") break; // line comment — skip rest of line
      if (ch === "/" && next === "*") { state = "blockComment"; c++; continue; }
      if (ch === '"') { state = "stringLit"; continue; }
      if (ch === "{") { depth++; seenOpenBrace = true; }
      else if (ch === "}") {
        depth--;
        if (seenOpenBrace && depth === 0) { fnEnd = i; break outer; }
      }
    }
  }

  if (fnEnd === -1) return code; // could not find end — leave unchanged

  // ── 4. Splice in the new implementation ───────────────────────────────
  return [
    ...lines.slice(0, attrStart),
    newImpl,
    ...lines.slice(fnEnd + 1),
  ].join("\n");
}

async function setStatus(id: number, status: string) {
  await db.update(contractProjectsTable).set({ status }).where(eq(contractProjectsTable.id, id));
}

function buildSystemPrompt(contractName: string, userContext?: string): string {
  return (
    "You are AURA — an autonomous Solana/Anchor smart-contract security engineer. " +
    `Your goal is to surgically improve the security of an existing Anchor Rust program named '${contractName}' ` +
    `to reach a score of ${TARGET_SCORE}/100 or above. ` +
    "The program code is already loaded — do NOT rewrite from scratch unless patch_function genuinely cannot fix the issue. " +
    "\n\nIMPORTANT CONSTRAINT: There is no compile tool in this loop. " +
    "Cargo-build-sbf takes 4–7 minutes per run, so compilation happens once at the end after you finish. " +
    "Write syntactically correct Rust — the audit_security tool evaluates security and correctness logic, not compilation. " +
    "\n\nCRITICAL RULE: You MUST call audit_security after every write_program or patch_function before calling finish. " +
    "finish is rejected (with an error message) if you have an un-audited change. " +
    "If audit_security shows a score regression the system automatically restores the previous best version. " +
    "\n\nPreferred workflow:\n" +
    "1. audit_security — understand the current security posture\n" +
    "2. patch_function — targeted fix for the most critical finding (PREFERRED)\n" +
    "3. audit_security — confirm improvement; system auto-restores best if score regressed\n" +
    "4. Repeat until score ≥ " + TARGET_SCORE + " or options exhausted\n" +
    "5. finish — declare done (only after a post-change audit_security)\n\n" +
    "Use write_program only when patch_function is genuinely insufficient. " +
    "Clippy findings (if any) are included in your opening context — address them alongside LLM audit findings. " +
    "Preserve the Anchor instruction/account structure so the IDL remains compatible." +
    (userContext ? `\n\nUSER CONTEXT (deployment/security requirements specific to this project): ${userContext}` : "")
  );
}

// ─── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  state: SolanaAgentState,
  project: ContractProjectRow,
  emit: (event: ForgeEvent) => void,
): Promise<string> {
  switch (toolName) {
    // ── write_program ─────────────────────────────────────────────────────────
    case "write_program": {
      const code = String(input.code ?? "").trim();
      const rationale = String(input.rationale ?? "");
      if (!code) return "ERROR: code is required.";
      state.code = code;
      state.lastAuditedCode = null; // working copy is now un-audited
      emit({ phase: "generating", message: `Rewriting program — ${rationale.slice(0, 120)}` });
      addNote(state, "write_program", rationale, "program code updated (un-audited)");
      return (
        "Program code has been updated. " +
        "NOTE: no compile step is available in this loop — ensure the code is syntactically valid Rust. " +
        "You MUST call audit_security before calling finish."
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

      const patched = applyRustFunctionPatch(state.code, fnName, newImpl);
      if (patched === state.code) {
        return (
          `WARNING: Function '${fnName}' was not found in the current code. ` +
          "Check the exact function name (without the `fn` keyword) and try again, " +
          "or use write_program for a full rewrite."
        );
      }

      state.code = patched;
      state.lastAuditedCode = null; // working copy is now un-audited
      emit({ phase: "hardening", message: `Patching ${fnName}() — ${issue.slice(0, 100)}` });
      addNote(state, "patch_function", `fn=${fnName} issue=${issue}`, "patch applied (un-audited)");
      return (
        `Patch applied to ${fnName}(). ` +
        "NOTE: no compile step in this loop — verify Rust syntax carefully. " +
        "You MUST call audit_security before calling finish."
      );
    }

    // ── audit_security ────────────────────────────────────────────────────────
    case "audit_security": {
      await setStatus(project.id, "auditing");
      emit({ phase: "auditing", message: "Running LLM security audit..." });

      const scored = await scoreContractSecurity(state.code, "SOLANA");

      // Mark this code version as audited regardless of outcome.
      state.lastAuditedCode = state.code;

      emit({ phase: "auditing", message: `Security score: ${scored.score}/100. ${scored.notes}` });

      const isFirstAudit = !state.baselineEstablished;
      state.baselineEstablished = true;

      if (isFirstAudit || scored.score >= state.bestScore) {
        // First audit always promotes unconditionally — it establishes the
        // authoritative fresh baseline even when the score is below the stored
        // parent value (the stored score may be stale).
        // Subsequent audits promote only on score improvement (no regression).
        state.bestCode = state.code;
        state.bestScore = scored.score;
        state.bestNotes = scored.notes;
        state.bestContextQuestion = scored.contextQuestion;
        state.bestGasNotes = scored.gasNotes;
        addNote(
          state,
          "audit_security",
          isFirstAudit ? "LLM audit — baseline established" : "LLM audit — promoted to best",
          `score=${scored.score} notes=${scored.notes.slice(0, 100)}`,
        );

        if (scored.score >= TARGET_SCORE) {
          return (
            `Score: ${scored.score}/100 — TARGET REACHED (${TARGET_SCORE}). ` +
            "Call finish to complete the hardening pass."
          );
        }

        return (
          `Score: ${scored.score}/100 — below target (${TARGET_SCORE}).\n\n` +
          `AUDIT NOTES: ${scored.notes}\n\n` +
          (scored.contextQuestion ? `CONTEXT QUESTION: ${scored.contextQuestion}\n\n` : "") +
          (isFirstAudit
            ? "Baseline established. Use patch_function to fix the most critical findings, then audit_security again."
            : "Use patch_function to fix the most critical findings, then audit_security again.")
        );
      } else {
        // Regression — restore the best snapshot so the agent continues from there.
        const prevBest = state.bestScore;
        state.code = state.bestCode;
        state.lastAuditedCode = state.bestCode; // restored code is now the audited working copy
        addNote(
          state,
          "audit_security",
          "LLM audit — score regressed, best restored",
          `new=${scored.score} best=${prevBest}`,
        );
        emit({
          phase: "hardening",
          message: `Score regressed (${scored.score}/100 < ${prevBest}/100); restoring previous best version.`,
        });
        return (
          `Score REGRESSED to ${scored.score}/100 (was ${prevBest}/100). ` +
          "The previous best version has been automatically restored as the working copy. " +
          `Best version audit notes: ${state.bestNotes}\n\n` +
          "Try a different approach or call finish if no more improvements are possible."
        );
      }
    }

    // ── finish ────────────────────────────────────────────────────────────────
    case "finish": {
      const reason = String(input.reason ?? "");

      // Reject finish if:
      //   (a) the baseline has never been established (no audit_security called yet), or
      //   (b) the current working code differs from what was last audited.
      if (!state.baselineEstablished || state.code !== state.lastAuditedCode) {
        return (
          "ERROR: You have un-audited changes (or have not yet called audit_security). " +
          "Call audit_security on the current code before calling finish. " +
          "The security score must be independently verified after every write_program or patch_function."
        );
      }

      state.finished = true;
      state.finishReason = reason;
      // Note: we deliberately do NOT accept a final_score from the agent.
      // state.bestScore is always the last independently audited score.

      if (state.bestScore >= TARGET_SCORE) {
        emit({ phase: "auditing", message: `Reached target security score: ${state.bestScore}/100.` });
      } else {
        emit({
          phase: "auditing",
          message: `Agent finished. Best achieved: ${state.bestScore}/100 (target ${TARGET_SCORE}). ${reason}`,
        });
        if (state.bestContextQuestion) {
          emit({
            phase: "auditing",
            message: `Providing more detail would improve the score: ${state.bestContextQuestion}`,
          });
        }
      }
      return "DONE";
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface SolanaHardenAgentResult {
  /** The source that achieved bestScore — always the audited best, never an un-audited working copy. */
  code: string;
  /** IDL at the time of the best snapshot (parent IDL; real IDL is produced by the final cargo compile). */
  idl: string;
  /** Independently audited security score for bestCode. */
  securityScore: number;
  securityNotes: string;
  contextQuestion: string | null;
  gasNotes: string;
  agentNotes: AgentNote[];
}

// ─── Main agent entry point ───────────────────────────────────────────────────

/**
 * Runs the Solana security-hardening agent loop.
 *
 * This is an LLM-only loop — no cargo compile inside.  The caller is
 * responsible for doing one final cargo compile on the returned code and
 * persisting the result.
 *
 * The returned `code` is always the version that independently scored
 * `securityScore` via scoreContractSecurity.  Agent-supplied scores are
 * never trusted.
 *
 * @param child         The new project row created for this hardening pass
 * @param parent        The source project whose code is being hardened
 * @param clippyFindings Pre-formatted clippy output to seed the opening message (may be "")
 * @param emit          Event emitter for streaming progress to the client
 * @returns             Best audited code/IDL/score found by the agent
 */
export async function runSolanaHardenAgent(
  child: ContractProjectRow,
  parent: ContractProjectRow,
  clippyFindings: string,
  emit: (event: ForgeEvent) => void,
): Promise<SolanaHardenAgentResult> {
  await setStatus(child.id, "auditing");
  emit({ phase: "auditing", message: "Agent preparing security-hardening pass..." });

  // ── 1. Load parent scratchpad so the agent knows what was already tried ─────
  let priorNotes: AgentNote[] = [];
  if (parent.agentNotes) {
    try {
      priorNotes = JSON.parse(parent.agentNotes) as AgentNote[];
    } catch {
      // Malformed — proceed with empty history
    }
  }

  // ── 2. Run initial audit if parent has no score ──────────────────────────
  let initialScore = parent.securityScore ?? 0;
  let initialNotes = parent.securityNotes ?? "";
  let initialContextQuestion: string | null = null;
  let initialGasNotes = parent.gasNotes ?? "";

  if (parent.securityScore === null) {
    emit({ phase: "auditing", message: "Running initial LLM security audit..." });
    const scored = await scoreContractSecurity(parent.smartContractCode!, "SOLANA");
    initialScore = scored.score;
    initialNotes = scored.notes;
    initialContextQuestion = scored.contextQuestion;
    initialGasNotes = scored.gasNotes;
    emit({ phase: "auditing", message: `Security score: ${scored.score}/100. ${scored.notes}` });
  }

  // ── 3. Initialize agent state ─────────────────────────────────────────────
  // The parent code is the starting working copy.  The best snapshot is seeded
  // with the parent's stored values as a conservative fallback, but
  // `baselineEstablished = false` ensures the first `audit_security` call in
  // the agent loop always promotes unconditionally — establishing a fresh,
  // authoritative baseline even if the fresh score differs from the stored one.
  // `lastAuditedCode = null` forces the agent to call audit_security before
  // finish is allowed.
  const parentCode = parent.smartContractCode!;
  const state: SolanaAgentState = {
    code: parentCode,
    idl: parent.abiOrIdl ?? "",
    // Conservative fallback best snapshot (overridden by first audit_security).
    bestCode: parentCode,
    bestIdl: parent.abiOrIdl ?? "",
    bestScore: initialScore,
    bestNotes: initialNotes,
    bestContextQuestion: initialContextQuestion,
    bestGasNotes: initialGasNotes,
    // Baseline not yet established — first audit_security will set this.
    baselineEstablished: false,
    // No audit has been run in this session yet.
    lastAuditedCode: null,
    scratchpad: priorNotes.map((n, i) => ({ ...n, step: i + 1 })),
    finished: false,
    finishReason: "",
  };

  // ── 4. Build conversation ─────────────────────────────────────────────────
  const userContext = child.userContext ?? undefined;
  const systemPrompt = buildSystemPrompt(parent.contractName, userContext);

  const priorHistory =
    priorNotes.length > 0
      ? `\n\nPrevious agent history (${priorNotes.length} step(s) already completed by an earlier run):\n` +
        priorNotes
          .map((n) => `  Step ${n.step}: [${n.action}] ${n.detail} → ${n.outcome}`)
          .join("\n")
      : "";

  const clippyBlock =
    clippyFindings
      ? `\n\nCARGO CLIPPY FINDINGS (deterministic static analysis):\n${clippyFindings}`
      : "\n\n(cargo clippy was not available in this environment)";

  const userContextBlock = userContext
    ? `\n\nUSER CONTEXT (deployment/security requirements for this specific project): ${userContext}`
    : "";

  const initialUserMsg =
    `You are performing a security-hardening pass on the existing '${parent.contractName}' Anchor program. ` +
    `The program currently scores ${initialScore}/100. ` +
    `Known issues from the last audit: ${initialNotes}` +
    clippyBlock +
    userContextBlock +
    priorHistory +
    `\n\nHere is the current program source code:\n` +
    "```rust\n" + parentCode + "\n```\n\n" +
    "The program code is loaded and ready. " +
    "Start by calling audit_security to understand the current security posture (the parent score above " +
    "may be stale — verify it). " +
    "Then use patch_function to address the most critical findings. " +
    "You have the full source above so you can copy exact function signatures. " +
    `Goal: reach a security score of ${TARGET_SCORE} or above. ` +
    "Remember: always call audit_security after every patch before calling finish.";

  const messages: AnthropicMessageParam[] = [
    { role: "user", content: initialUserMsg },
  ];

  // ── 5. ReAct agent loop (LLM-only) ───────────────────────────────────────
  let stepCount = 0;

  while (!state.finished && stepCount < MAX_AGENT_STEPS) {
    stepCount++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      tools: SOLANA_AGENT_TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      emit({ phase: "auditing", message: "Agent completed reasoning." });
      state.finished = true;
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolResults: AnthropicToolResultBlock[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        const text = block.text.trim();
        if (text) emit({ phase: "reasoning", message: text });
        continue;
      }
      if (block.type !== "tool_use") continue;

      const result = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        state,
        child,
        emit,
      );

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      if (state.finished) break;
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }
  }

  if (stepCount >= MAX_AGENT_STEPS && !state.finished) {
    emit({
      phase: "auditing",
      message: `Agent reached maximum steps (${MAX_AGENT_STEPS}). Saving best audited result so far.`,
    });
  }

  // ── 6. Return the best audited snapshot, not the current working copy ─────
  return {
    code: state.bestCode,
    idl: state.bestIdl,
    securityScore: state.bestScore,
    securityNotes: state.bestNotes,
    contextQuestion: state.bestScore >= TARGET_SCORE ? null : state.bestContextQuestion,
    gasNotes: state.bestGasNotes,
    agentNotes: state.scratchpad,
  };
}
