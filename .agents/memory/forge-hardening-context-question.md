---
name: Forge hardening context-question flow
description: How AURA Forge's security auditor asks the user for missing business context when hardening stalls below target score.
---

When a hardening loop (EVM or Solana, both the initial pipeline and the on-demand "Improve Security" re-run) finishes without reaching the target score, the auditor LLM may flag a specific missing piece of business/product context (e.g. intended access control, proxy vs standalone deployment) as `contextQuestion` in its audit response.

- This is persisted on the project row as `securityContextQuestion` (cleared once addressed or the target score is reached) and `userContext` (the user's free-text answer, seeded into the next hardening pass's prompt).
- The child row created by `POST /projects/:id/harden` accepts an optional `context` field in the body; it seeds `userContext` for that child's own hardening run only — it does not retroactively change the parent.

**Why:** giving the LLM more specific context (rather than re-guessing) often resolves ambiguous security tradeoffs that generic hardening can't from code alone.

**How to apply:** if the hardening/audit flow changes, keep the three pieces in sync: the audit prompt's `contextQuestion` field, the DB persistence of `securityContextQuestion`/`userContext`, and the frontend prompt+textarea in `dashboard.tsx`'s security sidebar.
