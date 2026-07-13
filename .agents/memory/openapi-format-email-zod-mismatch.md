---
name: OpenAPI format:email breaks orval zod codegen on zod v3
description: Why adding `format: email` to a new OpenAPI string property causes a generated-code typecheck failure unrelated to your own code.
---

Adding `type: string, format: email` to an OpenAPI schema property makes orval's
zod generator emit `zod.email()` for that field. `zod.email()` is zod v4 syntax
and does not exist on `zod` v3 (`zod.string().email()` is the v3 form). If the
project's installed `zod` is v3 (`import * as zod from 'zod'` resolving to v3),
the generated `lib/api-zod/src/generated/api.ts` fails to typecheck with
`Property 'email' does not exist on type 'typeof import(".../zod/index")'`
— even though you changed nothing by hand in that file.

**Why:** orval's schema-format-to-zod-method mapping assumes a zod version its
config doesn't currently pin/detect against the repo's actual installed zod.

**How to apply:** Before adding `format: email` (or other rare `format:` values)
to a new OpenAPI property, check how existing email fields in the same spec are
declared (e.g. auth signup/login schemas) — if they use plain `type: string`
without `format: email`, follow that pattern instead of introducing the format
keyword, to stay compatible with the installed zod major version.
