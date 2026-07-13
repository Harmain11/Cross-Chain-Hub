import { anthropic } from "@workspace/integrations-anthropic-ai";

const MODEL = "claude-sonnet-4-5";

async function ask(system: string, user: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = response.content.find((part) => part.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM returned no text content");
  }
  return block.text;
}

function extractCodeBlock(text: string): string {
  const match = text.match(/```(?:solidity|rust)?\n([\s\S]*?)```/);
  return (match ? match[1] : text).trim();
}

function extractJsonBlock(text: string): string {
  const match = text.match(/```(?:json)?\n([\s\S]*?)```/);
  return (match ? match[1] : text).trim();
}

export async function generateSolidityContract(
  prompt: string,
  contractName: string,
): Promise<string> {
  const system =
    "You are a senior Solidity smart-contract engineer. You write complete, self-contained, production-quality Solidity source files. " +
    "Rules: use pragma solidity ^0.8.24; the contract MUST be named exactly the given name; the contract MUST NOT require any constructor arguments (either no constructor, or a constructor that takes zero parameters); do not use external imports (no OpenZeppelin imports) — inline any needed logic directly in the file so it compiles standalone; respond with ONLY a single fenced ```solidity code block containing the full file, no prose before or after.";
  const user = `Write a Solidity contract named "${contractName}" that implements: ${prompt}`;
  const text = await ask(system, user);
  return extractCodeBlock(text);
}

export async function repairSolidityContract(
  brokenCode: string,
  compilerErrors: string,
  contractName: string,
): Promise<string> {
  const system =
    "You are a senior Solidity smart-contract engineer fixing a compile error. " +
    "Rules: keep the contract named exactly the given name; it MUST NOT require constructor arguments; no external imports; respond with ONLY a single fenced ```solidity code block containing the corrected full file, no prose before or after.";
  const user = `This Solidity contract named "${contractName}" fails to compile with solc.\n\nCONTRACT:\n${brokenCode}\n\nCOMPILER ERRORS:\n${compilerErrors}\n\nFix the contract so it compiles cleanly while preserving the original intent.`;
  const text = await ask(system, user);
  return extractCodeBlock(text);
}

export async function generateAnchorContract(
  prompt: string,
  contractName: string,
): Promise<{ code: string; idl: string }> {
  const system =
    "You are a senior Solana/Anchor smart-contract engineer. You write complete, realistic Anchor (Rust) program source files, plus their matching Anchor IDL JSON. " +
    "Rules: the program module name should reflect the given contract name; respond with the Rust source in a single fenced ```rust code block, followed by the IDL JSON in a single fenced ```json code block. No other prose.";
  const user = `Write an Anchor (Solana) program named "${contractName}" that implements: ${prompt}`;
  const text = await ask(system, user);

  const blocks = [
    ...text.matchAll(/```(\w+)?\n([\s\S]*?)```/g),
  ].map((m) => ({ lang: m[1] ?? "", body: (m[2] ?? "").trim() }));

  const rustBlock = blocks.find((b) => b.lang === "rust") ?? blocks[0];
  const jsonBlock =
    blocks.find((b) => b.lang === "json") ??
    blocks.find((b) => b !== rustBlock);

  if (!rustBlock || !jsonBlock) {
    throw new Error("LLM did not return both a Rust code block and a JSON IDL block");
  }

  // Validate the IDL is actually parseable JSON before persisting it.
  JSON.parse(jsonBlock.body);

  return { code: rustBlock.body, idl: jsonBlock.body };
}

export async function hardenSolidityContract(
  code: string,
  securityNotes: string,
  score: number,
  contractName: string,
  userContext?: string,
): Promise<string> {
  const system =
    "You are a senior smart-contract security engineer performing a remediation pass. Given a Solidity contract and an auditor's findings, rewrite the contract to fix EVERY flagged issue (access control, reentrancy, integer issues, unchecked external calls, missing validation, etc.) while preserving the contract's original functionality and public interface as much as possible. " +
    "Rules: keep the contract named exactly the given name; it MUST NOT require constructor arguments; no external imports; respond with ONLY a single fenced ```solidity code block containing the full corrected file, no prose before or after.";
  const contextBlock = userContext
    ? `\n\nADDITIONAL CONTEXT FROM THE USER (use this to resolve ambiguity, e.g. intended access control or business logic):\n${userContext}`
    : "";
  const user = `This Solidity contract named "${contractName}" scored ${score}/100 in a security audit.\n\nCONTRACT:\n${code}\n\nAUDITOR FINDINGS:\n${securityNotes}${contextBlock}\n\nRewrite the contract to remediate every finding and maximize its security score, without breaking compilation.`;
  const text = await ask(system, user);
  return extractCodeBlock(text);
}

export async function hardenAnchorContract(
  code: string,
  idl: string,
  securityNotes: string,
  score: number,
  contractName: string,
  userContext?: string,
): Promise<{ code: string; idl: string }> {
  const system =
    "You are a senior Solana/Anchor security engineer performing a remediation pass. Given an Anchor (Rust) program, its IDL, and an auditor's findings, rewrite BOTH the program and its IDL to fix EVERY flagged issue (PDA seed misuse, missing signer/owner checks, missing account validation, arithmetic overflow, etc.) while preserving the program's original functionality. " +
    "Rules: the program module name should reflect the given contract name; respond with the corrected Rust source in a single fenced ```rust code block, followed by the corrected IDL JSON in a single fenced ```json code block. No other prose.";
  const contextBlock = userContext
    ? `\n\nADDITIONAL CONTEXT FROM THE USER (use this to resolve ambiguity, e.g. intended access control or business logic):\n${userContext}`
    : "";
  const user = `This Anchor program named "${contractName}" scored ${score}/100 in a security audit.\n\nPROGRAM:\n${code}\n\nIDL:\n${idl}\n\nAUDITOR FINDINGS:\n${securityNotes}${contextBlock}\n\nRewrite the program and IDL to remediate every finding and maximize its security score.`;
  const text = await ask(system, user);

  const blocks = [
    ...text.matchAll(/```(\w+)?\n([\s\S]*?)```/g),
  ].map((m) => ({ lang: m[1] ?? "", body: (m[2] ?? "").trim() }));

  const rustBlock = blocks.find((b) => b.lang === "rust") ?? blocks[0];
  const jsonBlock =
    blocks.find((b) => b.lang === "json") ??
    blocks.find((b) => b !== rustBlock);

  if (!rustBlock || !jsonBlock) {
    throw new Error("LLM did not return both a Rust code block and a JSON IDL block");
  }

  JSON.parse(jsonBlock.body);

  return { code: rustBlock.body, idl: jsonBlock.body };
}

export async function scoreContractSecurity(
  code: string,
  ecosystem: "EVM" | "SOLANA",
): Promise<{ score: number; notes: string; contextQuestion: string | null }> {
  const system =
    "You are a smart-contract security auditor. Given source code, respond with ONLY a single fenced ```json code block: " +
    '{"score": <integer 0-100>, "notes": "<one or two sentence summary of the biggest risk or why it\'s solid>", "contextQuestion": <a short question asking the developer for the SPECIFIC business/product context you would need to judge or fix the biggest remaining risk (e.g. who should be authorized to call a function, expected token economics), or null if no such context is missing>}. ' +
    "No other prose.";
  const user = `Audit this ${ecosystem === "EVM" ? "Solidity" : "Anchor/Rust"} contract and score it:\n\n${code}`;
  const text = await ask(system, user);
  const parsed = JSON.parse(extractJsonBlock(text)) as {
    score: number;
    notes: string;
    contextQuestion?: string | null;
  };
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    notes: parsed.notes,
    contextQuestion: parsed.contextQuestion ?? null,
  };
}
