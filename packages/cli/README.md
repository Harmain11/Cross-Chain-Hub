# @aura-forge/cli

> AI-powered smart contract factory — right in your terminal.

Generate, compile, audit, and harden EVM (Solidity) and Solana (Anchor) contracts from plain English — with a Claude Code-style interactive interface that reads your workspace and understands your existing code.

---

## Install

```bash
# Run without installing (recommended)
npx @aura-forge/cli

# Or install globally
npm install -g @aura-forge/cli
```

## Quick start

```bash
cd my-defi-project
aura-forge
```

The CLI scans your workspace for `.sol` and `.rs` files on startup, so it can reference your existing contracts as context.

## Set your API key

Get a key at **https://aura-forge.replit.app/settings/api-keys**, then:

```
> /key af_your_api_key_here
```

Or set the environment variable:

```bash
export AURA_FORGE_API_KEY=af_...
aura-forge
```

## Usage

```
> Build me a staking contract where users deposit ETH and earn 8% APY
```

The pipeline streams live in your terminal:

```
  ⬡ StakingPool  ·  EVM

    ⟳ Generating  Generating Solidity contract…
    ✓ Compiled
    ✓ Auditing  ████████████████████ 94/100
    ✓ Hardened

  ✓ Contract saved  → contracts/StakingPool.sol
  ✓ Tests saved     → contracts/StakingPool.t.sol
  ✓ Security score  ████████████████████ 94/100
```

## Commands

| Command | Description |
|---|---|
| `/audit <file>` | Audit an existing contract (reads the file, sends to pipeline) |
| `/list` | List all `.sol` and `.rs` files in the workspace |
| `/chain evm\|solana` | Switch the active chain |
| `/key <api-key>` | Save your API key |
| `/help` | Show all commands |
| `/exit` | Quit |

## CLI flags

```bash
aura-forge [options]

  --api-url <url>    Custom API server URL  (env: AURA_FORGE_API_URL)
  --api-key <key>    API key               (env: AURA_FORGE_API_KEY)
  --chain <evm|sol>  Default chain
  --out <dir>        Output directory for contracts  (default: ./contracts)
  --help
```

## Workspace awareness

The CLI reads all `.sol` and `.rs` files in your current directory (recursively). When you reference a file by name in your prompt, it automatically includes the source as context:

```
> Improve security on my Token contract
  • Found Token.sol in workspace — including as context
```

This works like Claude Code — it reads your code so you don't have to paste it.
