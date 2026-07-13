---
name: New pipeline status values need OpenAPI enum updates
description: Adding a new status value to a job/pipeline text column (e.g. a new processing phase) 500s every list/get endpoint until the OpenAPI/Zod response schema's enum is updated to include it.
---

When a background pipeline (e.g. a multi-phase job runner) writes a new status string to a DB row — even though the DB column itself is a plain `text` column with no CHECK constraint — any endpoint whose OpenAPI response schema declares that field as a Zod `enum` will throw `ZodError: invalid_enum_value` and 500 as soon as a row with the new status is serialized, because response validation is stricter than the DB schema.

**Why:** added a new `"hardening"` pipeline status (for an auto security-improvement loop) purely in application code (pipeline logic + DB writes); `GET /api/projects` started 500ing the moment any job reached that phase, because the OpenAPI spec's `status` enum still only listed the old values.

**How to apply:** whenever a pipeline/job's set of possible status values changes, grep the OpenAPI spec (and any hand-written Zod schemas) for the old enum list and add the new value there too, then rerun codegen. Don't rely on the DB column type alone to tell you where every status enum is declared.
