---
name: drizzle-kit push vs runtime-managed tables
description: drizzle-kit push proposes dropping tables created at runtime by other libraries (e.g. connect-pg-simple sessions) unless excluded.
---

If any library creates and owns its own table at runtime (e.g. `connect-pg-simple`'s `user_sessions`, created via `createTableIfMissing`), `drizzle-kit push` will see that table in the live DB, find no matching entry in the drizzle schema files, and propose **dropping it** as a "data-loss statement" — including live session rows.

**Why:** Drizzle's push command diffs the live database against the declared schema and treats anything undeclared as safe to remove. It has no way to know the table is intentionally managed elsewhere.

**How to apply:** Add `tablesFilter: ["!table_name"]` to `drizzle.config.ts` for any such runtime-managed table before running `push`. Always read the push output carefully — if it warns about deleting a table you didn't intend to touch, stop and add it to `tablesFilter` rather than confirming/forcing the push.
