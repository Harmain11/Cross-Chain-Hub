# Community Issues to Create

Copy each block below into a new GitHub Issue on [Cross-Chain-Hub](https://github.com/Harmain11/Cross-Chain-Hub/issues/new).

---

## Issue 1 — Add Dynamic Network Routing Module

**Labels:** `good first issue` · `help wanted`
**Estimated effort:** Small (2–4 hours)

### Summary

The CLI currently ships with static RPC fallback lists hardcoded in `packages/cli/src/deploy.ts`. This issue asks contributors to extract that logic into a standalone `NetworkRouter` module that dynamically selects the fastest available RPC endpoint via a lightweight latency probe at startup.

### Acceptance Criteria

- [ ] New file `packages/cli/src/network-router.ts` exports a `NetworkRouter` class with a `getBestRpc(chain: SupportedChain): Promise<string>` method
- [ ] Probes each endpoint in the fallback list with a `getVersion` / `eth_blockNumber` call and returns the first to respond within 3 seconds
- [ ] Falls back to the static list order if all probes time out
- [ ] Unit tests cover: fastest endpoint wins, all timeout → first in list, single-endpoint list
- [ ] Existing `/deploy` and `/faucet` commands use `NetworkRouter` instead of the inline arrays

### Suggested Files to Touch

- `packages/cli/src/deploy.ts` — replace inline RPC arrays
- `packages/cli/src/faucet.ts` — same
- `packages/cli/src/network-router.ts` — new file

---

## Issue 2 — Expand Pydantic Validation Rules for Contract Audit Output

**Labels:** `good first issue` · `help wanted`
**Estimated effort:** Small (2–3 hours)

### Summary

The audit pipeline returns a structured JSON result that is validated by a Pydantic model. Currently the model only enforces field presence. This issue asks contributors to add stricter validation: score ranges, required finding severity enum values, and a check that `critical_count` matches the number of findings tagged `severity: critical`.

### Acceptance Criteria

- [ ] `AuditResult` model enforces `score` is in `[0, 100]`
- [ ] `Finding.severity` is constrained to `Literal["critical", "high", "medium", "low", "info"]`
- [ ] A `@model_validator` checks that `critical_count == len([f for f in findings if f.severity == "critical"])`
- [ ] At least 5 unit test fixtures: valid result, score out of range, unknown severity, mismatched critical count, empty findings list
- [ ] No existing tests broken

### Suggested Files to Touch

- `packages/api-server/src/audit/` or equivalent Python module — update Pydantic model
- Add `tests/test_audit_validation.py` (or `.ts` equivalent)

---

## Issue 3 — Extend CLI Flags for `/deploy` Command

**Labels:** `good first issue` · `help wanted`
**Estimated effort:** Small–Medium (3–5 hours)

### Summary

The `/deploy` CLI command currently uses interactive prompts for chain selection and contract path. This issue asks contributors to add optional flags so it can run non-interactively in CI environments.

### New Flags

| Flag | Type | Description |
|---|---|---|
| `--chain <name>` | string | Skip the interactive chain selector (e.g. `sepolia`, `devnet`) |
| `--file <path>` | string | Path to the contract file to deploy instead of the last-generated one |
| `--yes` | boolean | Skip all confirmation prompts (useful for CI) |
| `--timeout <ms>` | number | Override the default 30 000 ms deploy timeout |

### Acceptance Criteria

- [ ] All four flags implemented in `packages/cli/src/index.ts` (or the deploy command handler)
- [ ] `--chain` validates against the supported chain list and shows a clear error for unknown values
- [ ] `--yes` skips the "Are you sure?" prompt that appears before spending testnet funds
- [ ] When `--file` is provided, file existence is checked before any network calls
- [ ] Unit tests cover each flag independently and in combination with `--yes`
- [ ] `--help` output updated to show all new flags with descriptions
