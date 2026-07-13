---
name: New DB column breaks hand-mapped list endpoints
description: Adding a required field to an OpenAPI/Zod response schema 500s routes that hand-build the response object field-by-field instead of spreading the row.
---

When a list/summary endpoint constructs its response like `rows.map(row => ({ id: row.id, name: row.name, ... }))` instead of spreading the row, adding a new required field to the DB schema and the OpenAPI/Zod response schema is not enough — the hand-built mapping also needs the new field added explicitly, or Zod parsing throws "Required" and the endpoint 500s for every caller.

**Why:** Found when adding a `parentProjectId` column: the single-item `GET /projects/:id` endpoint just does `Response.parse(row)` (spreads naturally) and worked fine, but the `GET /projects` list endpoint manually mapped each field and was missed, breaking the entire history list until fixed.

**How to apply:** After adding a required field to a response schema, grep for every route that returns that schema and check whether it spreads the row (`Schema.parse(row)`) or hand-maps fields (`rows.map(row => ({...}))`) — hand-mapped ones need the new field added manually. Test the list/summary endpoints, not just the single-item one.
