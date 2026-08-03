# Contributing to AURA Forge

Thank you for your interest in contributing to **AURA Forge**! This document covers everything you need to get a local environment running, write good tests, and submit a pull request that gets merged quickly.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Good First Issues](#good-first-issues)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Local Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| pnpm | 8+ |
| Python | 3.10+ |
| Git | any recent |

### 1 — Clone and install

```bash
git clone https://github.com/Harmain11/Cross-Chain-Hub.git
cd Cross-Chain-Hub

# Install all JS/TS workspace packages
pnpm install

# Install Python dependencies (if contributing to agentic layer)
pip install -r requirements.txt
```

### 2 — Environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required — powers the AI generation and audit pipeline |
| `SESSION_SECRET` | Express session signing key |
| `DATABASE_URL` | PostgreSQL connection string |

### 3 — Start the development servers

```bash
# Start all artifact services at once
pnpm dev

# Or start individually
pnpm --filter @workspace/api-server run dev     # API on :3001
pnpm --filter @workspace/aura-forge run dev     # Web app
pnpm --filter @workspace/aura-forge-landing run dev  # Landing page
```

---

## Project Structure

```
Cross-Chain-Hub/
├── packages/
│   ├── cli/          # @aura-forge/cli — terminal REPL
│   └── mcp/          # @aura-forge/mcp — MCP server (4 tools)
├── artifacts/
│   ├── api-server/   # Express + Drizzle ORM backend
│   ├── aura-forge/   # React web app (Vite + React Query)
│   ├── aura-forge-landing/  # Marketing site
│   └── aura-forge-pitch/    # Pitch deck slides
├── CONTRIBUTING.md
├── ISSUES_TO_CREATE.md
└── README.md
```

---

## Development Workflow

1. **Fork** the repository and clone your fork.
2. Create a **feature branch** off `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes, following existing code style (TypeScript strict mode, ESLint, Prettier).
4. **Commit** with a descriptive message using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(cli): add --timeout flag to /deploy command
   fix(audit): handle empty contract body without crashing
   docs: update quickstart for Python 3.12
   ```
5. **Push** your branch and open a PR against `main`.

---

## Testing

### CLI & MCP packages

```bash
# Run unit tests
pnpm --filter @aura-forge/cli test
pnpm --filter @aura-forge/mcp test

# Run with coverage
pnpm --filter @aura-forge/cli test -- --coverage
```

### API server

```bash
pnpm --filter @workspace/api-server test
```

### Integration tests (requires a running API)

```bash
# Make sure the API server is running first
pnpm --filter @workspace/api-server run dev

# Then run integration suite
pnpm --filter @aura-forge/cli test:integration
```

### What to test

- All new CLI commands must have unit tests covering the happy path, network error, and invalid-input cases.
- New Pydantic validation rules must include at least one passing and one failing fixture.
- New chain integrations must include a mock RPC test confirming the fallback list is exercised.

---

## Submitting a Pull Request

### Checklist

- [ ] Branch is based on the latest `main`
- [ ] All existing tests pass (`pnpm test` in the root)
- [ ] New functionality has tests
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] No new ESLint warnings (`pnpm lint`)
- [ ] PR description explains **what** changed and **why**
- [ ] If it changes user-facing CLI behaviour, the `CHANGELOG.md` in the affected package is updated

### PR Title Format

Follow Conventional Commits in the PR title — it is used to auto-generate changelogs:

```
feat(cli): add dynamic network routing module
fix(audit): correct Pydantic score boundary condition
chore(deps): bump solc to 0.8.27
```

### Review process

- A maintainer will review within **3 business days**.
- We may request changes — please address feedback within 7 days or the PR may be closed to keep the queue clean.
- Once approved, a maintainer will squash-merge your PR.

---

## Good First Issues

New to the codebase? Check out issues labelled [`good first issue`](https://github.com/Harmain11/Cross-Chain-Hub/issues?q=label%3A%22good+first+issue%22) — they are scoped, well-documented, and have a suggested approach in the issue body.

See [ISSUES_TO_CREATE.md](ISSUES_TO_CREATE.md) for a list of open community tasks.
