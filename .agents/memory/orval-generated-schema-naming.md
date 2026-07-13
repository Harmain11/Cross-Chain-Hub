---
name: Orval-generated schema/hook naming is per-operation, not per-component-ref
description: Why importing a shared OpenAPI component schema name from generated zod/react-query output fails, and what name to use instead.
---

Orval (with the zod + react-query generators used in this project) does NOT export
runtime zod validators or hooks under the OpenAPI `components.schemas.<Name>` name
just because a path references that schema via `$ref`. Instead it names each
generated const/hook after the **operationId**, suffixed `Body`/`Params`/`Response`
(e.g. `CreateTeamBody`, `CreateTeamResponse`, `ListTeamsResponse`,
`ListTeamsResponseItem` for an array item). The same underlying component schema
can end up with a different generated name at every place it's used.

**Why:** Assuming `import { TeamMembershipSummary } from "@workspace/api-zod"` works
because that's the schema's name in `openapi.yaml` leads to `TS2693: only refers to
a type, but is being used as a value` — the schemas.ts file exports it as a
type-only interface (for the react-query client's TS types), while the actual
runtime zod parser lives under the operation-specific name in the zod package.

**How to apply:** After adding/changing an OpenAPI path, run codegen and then grep
`lib/api-zod/src/generated/api.ts` and `lib/api-client-react/src/generated/api.ts`
for `^export const` / `^export function` near the relevant operationId to find the
real generated names, rather than guessing from the component schema name.
