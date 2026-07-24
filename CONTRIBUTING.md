# Contributing to AURA Forge

Thank you for contributing! This guide covers the development workflow and — critically — the release process for the CLI and MCP packages.

---

## Development setup

```bash
# Prerequisites: Node.js ≥ 20, pnpm ≥ 9
pnpm install
```

See [README.md](README.md) for full environment setup (database, env vars, etc.).

---

## Repository layout

```
packages/
  cli/   — @aura-forge/cli   (terminal interface)
  mcp/   — @aura-forge/mcp   (MCP server for Claude Desktop / Claude Code)

artifacts/
  api-server/          — Express 5 REST API
  aura-forge/          — React + Vite SPA
  aura-forge-landing/  — Marketing landing page
  aura-forge-pitch/    — Pitch deck

lib/
  api-spec/            — OpenAPI source of truth + Orval codegen config
  api-client-react/    — Auto-generated React Query hooks
  api-zod/             — Auto-generated Zod schemas
  db/                  — Drizzle ORM schema
```

---

## Common commands

| Command | Description |
|---|---|
| `pnpm run typecheck` | Full TypeScript typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate client hooks and Zod schemas from `openapi.yaml` |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (dev only) |

---

## Release process — CLI & MCP

`@aura-forge/cli` and `@aura-forge/mcp` are always released **together at the same version**. This prevents mismatched builds where a developer has, say, CLI `0.2.0` talking to MCP `0.1.0`.

### 1. Update the changelogs

Before bumping the version, document what changed in both changelogs:

- `packages/cli/CHANGELOG.md`
- `packages/mcp/CHANGELOG.md`

Add a new `## [<new-version>] — <YYYY-MM-DD>` section at the top (below the header) with `### Added`, `### Changed`, `### Fixed`, and/or `### Removed` sub-sections as appropriate. Leave out sections that have no entries.

### 2. Bump versions (both packages at once)

```bash
pnpm version:bump <new-version>
# Example:
pnpm version:bump 0.2.0
```

This script (`version-bump.mjs` at the repo root) updates `packages/cli/package.json` and `packages/mcp/package.json` to the same version atomically. It will reject downgrades and invalid semver strings.

**Never** edit the `version` field in either package's `package.json` by hand — always go through `pnpm version:bump` so both stay in sync.

### 3. Review, commit, and tag

```bash
git diff packages/*/package.json        # sanity check
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

### 4. Build

```bash
pnpm --filter @aura-forge/cli run build
pnpm --filter @aura-forge/mcp run build
```

### 5. Publish to npm

```bash
pnpm --filter @aura-forge/cli publish
pnpm --filter @aura-forge/mcp publish
```

Both packages use `"access": "public"` in their `publishConfig`, so no extra flags are needed.

### Versioning policy

Follow [Semantic Versioning](https://semver.org/):

| Change type | Version bump |
|---|---|
| Bug fix, internal improvement | Patch (`0.1.x`) |
| New feature, backward-compatible | Minor (`0.x.0`) |
| Breaking CLI flag / MCP tool interface change | Major (`x.0.0`) |

---

## Modifying the API

All REST endpoints are contract-first. Edit `lib/api-spec/openapi.yaml`, then regenerate:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates the React Query hooks (`lib/api-client-react/`) and Zod validation schemas (`lib/api-zod/`) automatically.

---

## Pull request checklist

- [ ] `pnpm run typecheck` passes
- [ ] If REST endpoints changed, `pnpm --filter @workspace/api-spec run codegen` was run and the generated files are committed
- [ ] If releasing, both `packages/cli/CHANGELOG.md` and `packages/mcp/CHANGELOG.md` have a new version section
- [ ] If releasing, `pnpm version:bump <version>` was used (not manual edits to `package.json`)
- [ ] Branch is up to date with `main`
