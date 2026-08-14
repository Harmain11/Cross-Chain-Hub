#!/usr/bin/env node
/**
 * AURA Forge MCP Server
 * Exposes AURA Forge contract generation and audit tools to Claude Desktop,
 * Claude Code, and any MCP-compatible client.
 *
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "aura-forge": {
 *       "command": "npx",
 *       "args": ["@aura-forge/mcp"],
 *       "env": {
 *         "AURA_FORGE_API_KEY": "af_...",
 *         "AURA_FORGE_API_URL": "https://cross-chain-hub.replit.app"
 *       }
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── --help / --version (smoke-test targets) ──────────────────────────────────
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
  aura-forge-mcp — AURA Forge MCP Server

  Exposes smart-contract generation and audit tools to Claude Desktop,
  Claude Code, and any MCP-compatible client via the Model Context Protocol.

  Usage:
    aura-forge-mcp

  Environment variables:
    AURA_FORGE_API_KEY   Your AURA Forge API key (required for tool calls)
    AURA_FORGE_API_URL   API server URL (default: https://cross-chain-hub.replit.app)

  Typical claude_desktop_config.json entry:
    {
      "mcpServers": {
        "aura-forge": {
          "command": "npx",
          "args": ["@aura-forge/mcp"],
          "env": { "AURA_FORGE_API_KEY": "af_..." }
        }
      }
    }
`);
  process.exit(0);
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL  = process.env.AURA_FORGE_API_URL ?? "https://cross-chain-hub.replit.app";
const API_KEY  = process.env.AURA_FORGE_API_KEY ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

// ─── SSE streaming helper ─────────────────────────────────────────────────────
interface ForgeProject {
  id: number;
  contractName: string;
  ecosystem: string;
  status: string;
  smartContractCode?: string | null;
  testSuiteCode?: string | null;
  securityScore?: number | null;
  securityNotes?: string | null;
  gasNotes?: string | null;
}

interface ForgeEvent {
  phase: string;
  message?: string;
  project?: ForgeProject;
}

async function streamJob(
  id: number,
  onProgress: (phase: string, message: string) => void,
): Promise<ForgeProject> {
  const res = await fetch(`${API_URL}/api/forge-contract/${id}/stream`, {
    headers: authHeaders(),
  });
  if (!res.ok || !res.body) throw new Error(`Stream error ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let final: ForgeProject | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line || line.startsWith(":")) continue;
      const data = line.startsWith("data:") ? line.slice(5).trim() : line;
      if (!data) continue;
      try {
        const ev: ForgeEvent = JSON.parse(data);
        if (ev.phase === "done" && ev.project) { final = ev.project; }
        else if (ev.message) { onProgress(ev.phase, ev.message); }
      } catch {}
    }
  }
  if (!final) throw new Error("Stream ended without a done event");
  return final;
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "aura-forge",
  version: "0.1.0",
  description: "AI-powered smart contract factory — generate, audit, and harden EVM & Solana contracts",
});

// Tool: generate_contract
server.tool(
  "generate_contract",
  "Generate a smart contract from a plain-English description. Runs the full AURA Forge pipeline: generate → compile → audit → harden. Returns the final contract code, security score, and test suite.",
  {
    description: z.string().min(10).describe("Plain-English description of what the contract should do"),
    chain: z.enum(["EVM", "SOLANA"]).default("EVM").describe("Target blockchain: EVM (Solidity) or SOLANA (Anchor/Rust)"),
    contractName: z.string().optional().describe("Optional contract name. Auto-derived from description if omitted."),
    upgradeable: z.boolean().optional().describe("EVM only — generate an upgradeable proxy contract (UUPS pattern)."),
  },
  async ({ description, chain, contractName, upgradeable }, extra) => {
    // Derive name if not provided
    const name = contractName ?? deriveContractName(description);

    // Create the forge job
    const createRes = await fetch(`${API_URL}/api/forge-contract`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        prompt: description,
        contractName: name,
        ecosystem: chain,
        upgradeable: upgradeable ?? false,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      return { content: [{ type: "text", text: `Error creating forge job: ${body}` }], isError: true };
    }
    const { id } = (await createRes.json()) as { id: number };

    // Stream progress back
    const progressLines: string[] = [`Starting forge pipeline for **${name}** on ${chain}…`, ""];
    let lastPhase = "";

    const project = await streamJob(id, (phase, message) => {
      if (phase !== lastPhase) {
        const phaseLabel: Record<string, string> = {
          generating: "⟳ Generating",
          compiling:  "⟳ Compiling",
          healing:    "⟳ Self-healing",
          auditing:   "⟳ Auditing",
          hardening:  "⟳ Hardening",
          testing:    "⟳ Generating tests",
          error:      "✗ Error",
        };
        progressLines.push(`**${phaseLabel[phase] ?? phase}**`);
        lastPhase = phase;
      }
      progressLines.push(`  ${message}`);
    }).catch(err => { throw err; });

    // Build response
    const lines: string[] = [
      `# ✓ ${project.contractName} (${project.ecosystem})`,
      "",
      `**Security score:** ${project.securityScore ?? "N/A"}/100`,
      project.securityNotes ? `**Notes:** ${project.securityNotes}` : "",
      project.gasNotes ? `**Gas:** ${project.gasNotes}` : "",
      "",
      `**View on web:** ${API_URL}/projects/${project.id}`,
      "",
      "---",
      "",
      "## Contract Code",
      "",
      `\`\`\`${project.ecosystem === "EVM" ? "solidity" : "rust"}`,
      project.smartContractCode ?? "(no code returned)",
      "```",
    ];

    if (project.testSuiteCode) {
      lines.push("", "## Test Suite", "", "```typescript", project.testSuiteCode, "```");
    }

    return { content: [{ type: "text", text: lines.filter(l => l !== undefined).join("\n") }] };
  },
);

// Tool: audit_contract
server.tool(
  "audit_contract",
  "Audit an existing smart contract for security vulnerabilities, gas inefficiencies, and best practices. Returns a security score (0–100) and detailed remediation notes.",
  {
    code: z.string().min(10).describe("The full source code of the contract to audit"),
    chain: z.enum(["EVM", "SOLANA"]).default("EVM").describe("The blockchain the contract targets"),
    contractName: z.string().optional().describe("Optional name for the contract"),
  },
  async ({ code, chain, contractName }) => {
    const name = contractName ?? "AuditTarget";
    const prompt = `Audit this existing ${chain} smart contract for security vulnerabilities, gas inefficiencies, and best-practice violations. Provide a detailed score and remediation.\n\n// File: ${name}${chain === "EVM" ? ".sol" : ".rs"}\n${code}`;

    const createRes = await fetch(`${API_URL}/api/forge-contract`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ prompt, contractName: name, ecosystem: chain }),
    });
    if (!createRes.ok) {
      return { content: [{ type: "text", text: `Error: ${await createRes.text()}` }], isError: true };
    }
    const { id } = (await createRes.json()) as { id: number };
    const project = await streamJob(id, () => {});

    const lines = [
      `# Audit: ${project.contractName}`,
      "",
      `**Security score:** ${project.securityScore ?? "N/A"}/100`,
      "",
      project.securityNotes ?? "No notes returned.",
      "",
      project.gasNotes ? `**Gas notes:** ${project.gasNotes}` : "",
      "",
      `**Full report:** ${API_URL}/projects/${project.id}`,
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// Tool: list_contracts
server.tool(
  "list_contracts",
  "List the current user's previously forged contracts from AURA Forge.",
  {},
  async () => {
    const res = await fetch(`${API_URL}/api/projects`, { headers: authHeaders() });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${await res.text()}` }], isError: true };
    }
    const projects = (await res.json()) as ForgeProject[];
    if (projects.length === 0) {
      return { content: [{ type: "text", text: "No contracts found. Use generate_contract to forge one." }] };
    }
    const lines = ["# Your AURA Forge Contracts", ""];
    for (const p of projects.slice(0, 20)) {
      const score = p.securityScore !== null ? `${p.securityScore}/100` : "—";
      lines.push(`- **${p.contractName}** (${p.ecosystem}) · score ${score} · status: ${p.status} · id: ${p.id}`);
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// Tool: get_contract
server.tool(
  "get_contract",
  "Retrieve the full source code, ABI, and security report for a previously forged contract by its ID.",
  { id: z.number().describe("The numeric project ID from list_contracts or the web UI") },
  async ({ id }) => {
    const res = await fetch(`${API_URL}/api/projects/${id}`, { headers: authHeaders() });
    if (!res.ok) {
      return { content: [{ type: "text", text: `Error: ${await res.text()}` }], isError: true };
    }
    const p = (await res.json()) as ForgeProject & { prompt?: string; abiOrIdl?: string };
    const lines = [
      `# ${p.contractName} (${p.ecosystem})`,
      "",
      `**Status:** ${p.status}`,
      `**Security score:** ${p.securityScore ?? "N/A"}/100`,
      p.securityNotes ? `**Security notes:** ${p.securityNotes}` : "",
      p.gasNotes ? `**Gas notes:** ${p.gasNotes}` : "",
      "",
      `**View on web:** ${API_URL}/projects/${p.id}`,
      "",
      "## Contract Code",
      "",
      `\`\`\`${p.ecosystem === "EVM" ? "solidity" : "rust"}`,
      p.smartContractCode ?? "(not yet generated)",
      "```",
    ];
    if (p.testSuiteCode) {
      lines.push("", "## Test Suite", "", "```typescript", p.testSuiteCode, "```");
    }
    if (p.abiOrIdl) {
      lines.push("", "## ABI / IDL", "", "```json", p.abiOrIdl, "```");
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deriveContractName(prompt: string): string {
  const patterns = [
    /(?:build|create|make|write|generate)\s+(?:me\s+)?(?:a\s+)?([A-Za-z][A-Za-z\s]{2,30}?)(?:\s+contract|\s+where|\s+that|$)/i,
    /([A-Za-z][A-Za-z\s]{2,20}?)\s+contract/i,
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, "").replace(/^./, c => c.toUpperCase());
  }
  return prompt.split(/\s+/).slice(0, 3).map(w => w.replace(/[^A-Za-z]/g, "")).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join("").slice(0, 24) || "MyContract";
}

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
