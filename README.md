<div align="center">

# ⚡ AURA Forge

### The AI-Powered Smart Contract Factory

**Type plain English. Get production-ready, audited, deployed smart contracts.**

[![npm](https://img.shields.io/npm/v/@aura-forge/cli?label=%40aura-forge%2Fcli&color=blueviolet&style=flat-square)](https://www.npmjs.com/package/@aura-forge/cli)
[![npm](https://img.shields.io/npm/v/@aura-forge/mcp?label=%40aura-forge%2Fmcp&color=blueviolet&style=flat-square)](https://www.npmjs.com/package/@aura-forge/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@aura-forge/cli?color=blue&style=flat-square)](https://www.npmjs.com/package/@aura-forge/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Live API](https://img.shields.io/badge/API-live-brightgreen?style=flat-square)](https://cross-chain-hub.replit.app/api/healthz)
[![Publish](https://img.shields.io/github/actions/workflow/status/Harmain11/Cross-Chain-Hub/publish.yml?label=publish&style=flat-square)](https://github.com/Harmain11/Cross-Chain-Hub/actions)

[**Live App**](https://cross-chain-hub.replit.app) · [**CLI on npm**](https://npmjs.com/package/@aura-forge/cli) · [**MCP on npm**](https://npmjs.com/package/@aura-forge/mcp) · [**Docs**](https://cross-chain-hub.replit.app/docs) · [**Discord**](#community)

</div>

---

## What is AURA Forge?

AURA Forge is an **autonomous AI agent** that turns a plain-English description into a fully compiled, security-audited, and deployed smart contract — in under 45 seconds.

It isn't a code template. It isn't a wrapper around GPT. It's a multi-step **ReAct agent loop** that writes code, runs the real compiler, reads the error, fixes it, audits for 47 vulnerability patterns, hardens until the security score hits ≥ 85/100, generates a test suite, and hands you back the ABI, bytecode, and a deployed testnet address.

```
You:         "Create a staking contract with 5% APY, a 7-day lockup, and an emergency withdraw."

AURA Forge:  ✔ Contract generated    (Solidity / Anchor Rust)
             ✔ Compiled              (solc / cargo-build-sbf)
             ✔ Audited  94 / 100     (47 vulnerability patterns)
             ✔ Hardened              (self-healing: 1.3 avg retries)
             ✔ Tests generated       (Foundry / Anchor TypeScript)
             ✔ Deployed  0xabc…      (Sepolia testnet)
```

---

## Features

| | |
|---|---|
| 🧠 **ReAct Agent Loop** | Up to 18 tool-call steps per run — the agent reasons, acts, observes, and self-corrects until done |
| 🔐 **47-Pattern Audit** | Reentrancy, access control, integer overflow, tx.origin, selfdestruct, unchecked calls, and 41 more |
| 🔁 **Self-Healing Hardening** | Loops automatically until security score ≥ 85/100 — no manual patching |
| ⛓️ **Dual-Chain** | Solidity for EVM chains · Anchor/Rust for Solana |
| 🚀 **One-Click Deploy** | Sepolia, Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, Polygon Amoy, Solana Devnet |
| 🧪 **Auto Test Generation** | Foundry tests for EVM · TypeScript/Anchor tests for Solana |
| 🤖 **MCP Integration** | Plug directly into Claude Desktop or Claude Code as a native tool |
| 🖥️ **Workspace-Aware CLI** | Scans your `.sol` / `.rs` files for context — like having Copilot for contract auditing |
| 📡 **Streaming Reasoning** | Watch the agent's live thought process in the console panel |
| 🔑 **Team API** | REST API + API-key management for CI/CD embedding |

---

## 30-Second Quickstart

### CLI (interactive forge session)

```bash
npx @aura-forge/cli
```

At the prompt, type your contract in plain English:

```
> A vesting contract that releases tokens linearly over 2 years with a 6-month cliff.
```

That's it. The agent runs the full pipeline and saves the contract, ABI, and tests to your project.

**Useful commands inside the session:**

| Command | Description |
|---|---|
| `/chain evm` | Switch to Solidity / EVM mode |
| `/chain solana` | Switch to Anchor / Rust / Solana mode |
| `/audit` | Re-audit the current contract |
| `/list` | List all saved contracts |
| `/key <api-key>` | Set your AURA Forge API key |
| `/help` | Full command reference |

### MCP (inside Claude Desktop or Claude Code)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["-y", "@aura-forge/mcp"],
      "env": {
        "AURA_FORGE_API_KEY": "your-api-key"
      }
    }
  }
}
```

Or with Claude Code:

```bash
claude mcp add aura-forge npx @aura-forge/mcp --env AURA_FORGE_API_KEY=your-api-key
```

Then ask Claude:

> *"Use AURA Forge to create a multi-sig wallet contract for 3-of-5 signers and deploy it to Base testnet."*

---

## The Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AURA Forge Agent                           │
│                                                                     │
│  Plain English ──► Planner ──► Tool Loop (up to 18 steps)          │
│                                                                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐   │
│   │ Generate │──►│ Compile  │──►│  Audit   │──►│   Harden     │   │
│   │ Solidity │   │  (solc)  │   │ 47 rules │   │ loop ≥ 85/100│   │
│   │  / Rust  │   │  / sbf   │   │ 0–100 ✓  │   │  self-heal   │   │
│   └──────────┘   └──────────┘   └──────────┘   └──────────────┘   │
│                       │ error?                                      │
│                       └──────────► auto-fix ──────────────────►┘   │
│                                                                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────────────────────────┐   │
│   │  Tests   │   │  Deploy  │   │  ABI · Bytecode · IDL        │   │
│   │ Foundry  │──►│ Testnet  │──►│  Address · Security Report   │   │
│   │ / Anchor │   │  1-click │   │  Test Suite                  │   │
│   └──────────┘   └──────────┘   └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Supported Chains

| Chain | Network | Type |
|---|---|---|
| Ethereum | Sepolia testnet | EVM / Solidity |
| Base | Base Sepolia | EVM / Solidity |
| Arbitrum | Arbitrum Sepolia | EVM / Solidity |
| Optimism | Optimism Sepolia | EVM / Solidity |
| Polygon | Amoy testnet | EVM / Solidity |
| Solana | Devnet | Anchor / Rust |

---

## Real-World Use Cases

<details>
<summary><strong>🏦 DeFi — Staking with APY + Lockup</strong></summary>

```
Create a staking contract: users deposit ETH, earn 8% APY,
7-day lockup, emergency withdraw with 10% penalty.
```
</details>

<details>
<summary><strong>🎨 NFT — Dutch Auction</strong></summary>

```
NFT collection of 10,000 tokens, Dutch auction starting at 1 ETH
dropping 0.1 ETH every 10 minutes to a floor of 0.1 ETH.
Whitelist phase first 24 hours.
```
</details>

<details>
<summary><strong>🗳️ DAO — Multi-sig Governance</strong></summary>

```
3-of-5 multisig DAO contract. Members can propose, vote, and execute
transactions. 48-hour voting window. Quorum 60%.
```
</details>

<details>
<summary><strong>📅 Vesting — Team Token Release</strong></summary>

```
Token vesting contract for a team allocation: 2-year linear vesting,
6-month cliff, revocable by owner, multi-beneficiary.
```
</details>

<details>
<summary><strong>🌐 Solana — SPL Token + Whitelist Mint</strong></summary>

```
Solana NFT program: Anchor framework, whitelist mint phase,
royalties 5%, max 5 mints per wallet, random reveal after mint-out.
```
</details>

---

## MCP Tools

When connected via MCP, AURA Forge exposes four tools to Claude:

| Tool | What it does |
|---|---|
| `generate_contract` | Full pipeline: generate → compile → audit → harden → return source + ABI + security score + tests |
| `audit_contract` | Audit existing Solidity or Rust code, return 0–100 score + remediation steps |
| `list_contracts` | List all contracts in your workspace |
| `get_contract` | Fetch source, ABI/IDL, and security report for a saved contract |

---

## API (REST)

The production API is live at `https://cross-chain-hub.replit.app/api`.

```bash
# Health check
curl https://cross-chain-hub.replit.app/api/healthz

# Forge a contract
curl -X POST https://cross-chain-hub.replit.app/api/projects \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"chain":"evm","prompt":"ERC-20 with 1B supply and burn function"}'
```

Get an API key at [cross-chain-hub.replit.app](https://cross-chain-hub.replit.app) after signing up.

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@aura-forge/cli`](packages/cli) | [![npm](https://img.shields.io/npm/v/@aura-forge/cli?style=flat-square)](https://npmjs.com/package/@aura-forge/cli) | Interactive CLI — workspace-aware, REPL-style |
| [`@aura-forge/mcp`](packages/mcp) | [![npm](https://img.shields.io/npm/v/@aura-forge/mcp?style=flat-square)](https://npmjs.com/package/@aura-forge/mcp) | MCP server for Claude Desktop & Claude Code |

---

## Stats

| Metric | Value |
|---|---|
| Contracts forged | 1,200+ |
| Average audit score | 93 / 100 |
| Average build time | < 45 seconds |
| Self-healing retries (avg) | 1.3 |
| Vulnerability patterns checked | 47 |
| Beta partners | 20 |

---

## Project Structure

```
Cross-Chain-Hub/
├── artifacts/
│   ├── api-server/          # Express + Drizzle REST API
│   ├── aura-forge/          # React dashboard (Monaco editor, live console)
│   ├── aura-forge-landing/  # Marketing landing page
│   └── aura-forge-pitch/    # Pitch deck
├── packages/
│   ├── cli/                 # @aura-forge/cli (npm)
│   └── mcp/                 # @aura-forge/mcp (npm)
├── lib/
│   └── db/                  # Drizzle ORM schema + migrations
└── .github/
    └── workflows/
        └── publish.yml      # Auto-publish to npm on v* tags
```

---

## Self-Hosting

```bash
git clone https://github.com/Harmain11/Cross-Chain-Hub.git
cd Cross-Chain-Hub
pnpm install
cp .env.example .env   # add ANTHROPIC_API_KEY and DATABASE_URL
pnpm dev
```

**Requirements:** Node 20+, pnpm 10+, PostgreSQL 15+

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full local dev guide.

---

## Contributing

PRs welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

- 🐛 [Report a bug](https://github.com/Harmain11/Cross-Chain-Hub/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/Harmain11/Cross-Chain-Hub/issues/new?template=feature_request.md)
- 🌟 **Star this repo** if AURA Forge saves you time

---

## License

MIT © [Harmain11](https://github.com/Harmain11)

---

<div align="center">

**Built with Claude · Deployed on Replit · Published on npm**

[⭐ Star this repo](https://github.com/Harmain11/Cross-Chain-Hub) if you find it useful!

</div>
