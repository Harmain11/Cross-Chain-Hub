# Contributing to AURA Forge

Thanks for helping make AURA Forge better! This guide covers everything you need to go from zero to a merged PR.

## Quick Links

- [Report a bug](https://github.com/Harmain11/Cross-Chain-Hub/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/Harmain11/Cross-Chain-Hub/issues/new?template=feature_request.md)
- [Project structure](#project-structure)
- [Running locally](#running-locally)

## What we'd love help with

- 🔐 New vulnerability patterns for the 47-pattern audit engine
- ⛓️ Additional chain support (zkSync, Berachain, Monad, etc.)
- 🧪 Test coverage for the ReAct agent loop
- 📖 Docs and examples
- 🐛 Bug fixes (check open issues)

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| pnpm | 10+ |
| PostgreSQL | 15+ |
| Python | 3.10+ (for Slither audit) |

## Running Locally

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/Cross-Chain-Hub.git
cd Cross-Chain-Hub

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, DATABASE_URL, SESSION_SECRET

# 4. Push database schema
pnpm --filter @workspace/db db:push

# 5. Start everything
pnpm dev
```

Open `http://localhost:5173` for the dashboard.

## Project Structure

```
Cross-Chain-Hub/
├── artifacts/
│   ├── api-server/           # Express REST API + agent logic
│   │   └── src/lib/forge/
│   │       ├── evmAgent.ts   # ReAct agent loop (main entry point)
│   │       ├── pipeline.ts   # Chain router
│   │       ├── llm.ts        # Claude tool-use helpers
│   │       └── eipLookup.ts  # Live EIP spec fetcher
│   ├── aura-forge/           # React dashboard (Monaco, live console)
│   ├── aura-forge-landing/   # Marketing landing page
│   └── aura-forge-pitch/     # Pitch deck (slides)
├── packages/
│   ├── cli/                  # @aura-forge/cli npm package
│   └── mcp/                  # @aura-forge/mcp npm package
├── lib/
│   └── db/                   # Drizzle ORM schema + migrations
└── .github/
    ├── workflows/publish.yml # Auto-publish on v* tags
    └── ISSUE_TEMPLATE/       # Bug / feature templates
```

## Development Workflow

1. **Branch** from `main`: `git checkout -b feat/my-feature`
2. **Code** — follow the patterns already in the file you're editing
3. **Test** — `pnpm test` (or test the specific package with `pnpm --filter <package> test`)
4. **Lint** — `pnpm lint`
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation only
   - `refactor:` code cleanup without behaviour change
   - `test:` adding/fixing tests
6. **PR** — fill in the template, link the related issue

## Adding a Vulnerability Pattern

The audit engine lives in `artifacts/api-server/src/lib/forge/evmAgent.ts`. Each tool call to `run_slither` returns structured findings. To add a new pattern:

1. Add it to the Slither detector list (or implement a custom check in the `audit_security` tool handler)
2. Add a test case in the corresponding `*.test.ts` file
3. Update the pattern count in `README.md` and `artifacts/aura-forge-landing/`

## Releasing (maintainers)

```bash
# Bump versions
node version-bump.mjs

# Commit, tag, and push — GitHub Actions publishes to npm automatically
git add .
git commit -m "chore: release v1.x.x"
git tag v1.x.x
git push origin main v1.x.x
```

The `publish.yml` workflow builds both packages and publishes to npm when a `v*` tag is pushed.

## Code of Conduct

Be kind. We're all here to build cool things.
