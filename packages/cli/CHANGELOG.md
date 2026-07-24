# Changelog — @aura-forge/cli

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are bumped with `pnpm version:bump` — see [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## [0.1.0] — 2026-07-24

### Added
- Initial public release of the AURA Forge CLI.
- `aura-forge login` — authenticate with an AURA Forge account and store an API key locally.
- `aura-forge logout` — revoke the active API key server-side and clear local credentials.
- `aura-forge whoami` — print the currently authenticated account.
- `aura-forge signup` — create a new AURA Forge account from the terminal.
- Auto-prompt on first run: if no API key is found, the CLI asks whether to sign up or log in before continuing.
- Interactive REPL with `/deploy` command — one-command testnet deployment to Sepolia (EVM) or Solana devnet.
- Interactive REPL with `/faucet` command — request devnet SOL from a public faucet.
- RPC fallback lists for Sepolia and Solana devnet with clear guidance when all endpoints fail.
- Improved signup error messages covering duplicate-email, invalid-email, and server-error paths.
- `@aura-forge/cli` and `@aura-forge/mcp` are always published at the same version to prevent mismatched installs.
