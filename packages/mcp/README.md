# @aura-forge/mcp

> MCP server for [AURA Forge](https://github.com/Harmain11/Cross-Chain-Hub) — lets Claude Desktop and Claude Code forge, audit, and deploy smart contracts natively.

[![npm version](https://img.shields.io/npm/v/@aura-forge/mcp?style=flat-square&color=blueviolet)](https://www.npmjs.com/package/@aura-forge/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@aura-forge/mcp?style=flat-square)](https://www.npmjs.com/package/@aura-forge/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](../../LICENSE)

## What it does

Once connected, Claude can call AURA Forge directly — generating, auditing, and deploying smart contracts as part of any conversation. No copy-pasting code, no switching tools.

> *"Use AURA Forge to create a 3-of-5 multisig DAO and deploy it to Base testnet."*

Claude handles the rest.

## Setup — Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["-y", "@aura-forge/mcp"],
      "env": {
        "AURA_FORGE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see **AURA Forge** in the tools list.

## Setup — Claude Code

```bash
claude mcp add aura-forge npx @aura-forge/mcp --env AURA_FORGE_API_KEY=your-api-key-here
```

## Get an API Key

Sign up free at [cross-chain-hub.replit.app](https://cross-chain-hub.replit.app) → Settings → API Keys.

## Available Tools

| Tool | Description |
|---|---|
| `generate_contract` | Full pipeline: generate → compile → audit → harden → return source, ABI/IDL, score, tests |
| `audit_contract` | Audit any Solidity or Rust code — returns 0–100 score and remediation steps |
| `list_contracts` | List all contracts in your AURA Forge workspace |
| `get_contract` | Fetch source code, ABI/IDL, and security report for a saved contract |

## Example Prompts for Claude

```
"Forge an ERC-20 token with 1 billion supply, minting, burning,
 and a 2% transfer tax. Deploy to Sepolia."

"Audit this Solidity contract and tell me the top 3 security issues."

"Create a vesting contract: 2-year linear, 6-month cliff,
 multi-beneficiary, revocable by owner."

"Build a Solana NFT program with Anchor: whitelist phase,
 5% royalties, max 5 mints per wallet."
```

## Supported Chains

`evm` → Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, Polygon Amoy  
`solana` → Solana Devnet

## Custom API URL

Point to a self-hosted AURA Forge instance:

```json
{
  "env": {
    "AURA_FORGE_API_KEY": "your-key",
    "AURA_FORGE_API_URL": "https://your-instance.example.com"
  }
}
```

---

Part of [AURA Forge](https://github.com/Harmain11/Cross-Chain-Hub) · [Report a bug](https://github.com/Harmain11/Cross-Chain-Hub/issues)
