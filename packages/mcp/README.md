# @aura-forge/mcp

> AURA Forge as an MCP server — smart contract tools inside Claude Desktop & Claude Code.

Connect AURA Forge to Claude and use natural language to generate, audit, and retrieve smart contracts without leaving your Claude conversation.

---

## Setup — Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["@aura-forge/mcp"],
      "env": {
        "AURA_FORGE_API_KEY": "af_your_key_here",
        "AURA_FORGE_API_URL": "https://aura-forge.replit.app"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see AURA Forge tools appear in the tool list.

## Setup — Claude Code

```bash
claude mcp add aura-forge \
  --command "npx @aura-forge/mcp" \
  --env AURA_FORGE_API_KEY=af_your_key_here
```

## Available tools

### `generate_contract`
Generate a smart contract from a plain-English description. Runs the full pipeline (generate → compile → audit → harden) and returns the final code, security score, and test suite.

**Example prompt to Claude:**
> *"Use AURA Forge to build me a DAO treasury multisig that requires 3-of-5 signatures and a 48-hour timelock for spends over 5 ETH."*

### `audit_contract`
Audit an existing contract. Paste the code and get back a security score (0–100) and remediation notes.

**Example prompt to Claude:**
> *"Audit this Solidity contract with AURA Forge"* → paste code

### `list_contracts`
List your previously forged contracts.

### `get_contract`
Get the full source, ABI, and security report for a contract by ID.

## Get an API key

**https://aura-forge.replit.app/settings/api-keys**
