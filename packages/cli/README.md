# @aura-forge/cli

> Workspace-aware CLI for [AURA Forge](https://github.com/Harmain11/Cross-Chain-Hub) — type plain English, get a compiled, audited, deployed smart contract.

[![npm version](https://img.shields.io/npm/v/@aura-forge/cli?style=flat-square&color=blueviolet)](https://www.npmjs.com/package/@aura-forge/cli)
[![npm downloads](https://img.shields.io/npm/dm/@aura-forge/cli?style=flat-square)](https://www.npmjs.com/package/@aura-forge/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](../../LICENSE)

## Install

```bash
# Run without installing (recommended)
npx @aura-forge/cli

# Or install globally
npm install -g @aura-forge/cli
aura-forge
```

## Usage

Run `aura-forge` (or `npx @aura-forge/cli`) inside any project directory. The CLI scans your `.sol` and `.rs` files automatically for context — like a Copilot that already knows your codebase.

```
╔══════════════════════════════════════╗
║          AURA Forge CLI              ║
║  Type a contract in plain English.   ║
╚══════════════════════════════════════╝

[aura-forge] > 
```

**Example prompt:**

```
[aura-forge] > A staking contract: users deposit ETH, earn 5% APY,
               7-day lockup, emergency withdraw with 10% penalty fee.
```

The agent will stream its reasoning live as it:
1. 🧠 **Plans** the contract structure
2. ✏️  **Generates** Solidity or Anchor/Rust code
3. 🔨 **Compiles** with the real compiler (`solc` / `cargo-build-sbf`)
4. 🔐 **Audits** across 47 vulnerability patterns (score 0–100)
5. 🔁 **Hardens** in a loop until score ≥ 85/100
6. 🧪 **Generates** a Foundry / Anchor TypeScript test suite
7. 🚀 **Deploys** to your chosen testnet

## Commands

| Command | Description |
|---|---|
| `/chain evm` | Switch to Solidity / EVM mode (default) |
| `/chain solana` | Switch to Anchor / Rust / Solana mode |
| `/audit` | Re-run the security audit on the current contract |
| `/list` | List all contracts saved in this workspace |
| `/key <api-key>` | Save your AURA Forge API key to config |
| `/help` | Show all commands |
| `/exit` | Quit the session |

## Flags

```bash
aura-forge [flags]

  --api-url <url>    API base URL (default: https://cross-chain-hub.replit.app)
  --api-key <key>    AURA Forge API key (or set AURA_FORGE_API_KEY env var)
  --chain <chain>    Starting chain: evm or solana (default: evm)
  --out <dir>        Output directory for saved contracts (default: ./contracts)
  --help             Show help
```

## Authentication

Get a free API key at [cross-chain-hub.replit.app](https://cross-chain-hub.replit.app):

```bash
# Set via flag
aura-forge --api-key af_...

# Or set once and save to config
[aura-forge] > /key af_...

# Or via environment variable
AURA_FORGE_API_KEY=af_... aura-forge
```

## Supported Chains

| Chain | Testnet | Language |
|---|---|---|
| Ethereum | Sepolia | Solidity |
| Base | Base Sepolia | Solidity |
| Arbitrum | Arbitrum Sepolia | Solidity |
| Optimism | Optimism Sepolia | Solidity |
| Polygon | Amoy | Solidity |
| Solana | Devnet | Anchor / Rust |

## Output

After a successful forge, the CLI saves to your `--out` directory:

```
contracts/
└── MyStakingContract/
    ├── MyStakingContract.sol     # Source code
    ├── MyStakingContract.json    # ABI + bytecode
    ├── security-report.json      # Audit score + findings
    └── test/
        └── MyStakingContract.t.sol  # Foundry tests
```

---

Part of [AURA Forge](https://github.com/Harmain11/Cross-Chain-Hub) · [Report a bug](https://github.com/Harmain11/Cross-Chain-Hub/issues)
