# Memory Index

- [esbuild + connect-pg-simple](esbuild-external-runtime-file-deps.md) — packages that read sibling files (e.g. `table.sql`) at runtime via `__dirname` break when esbuild-bundled; must be externalized.
- [React Query default retry vs 401](react-query-401-retry-spinner.md) — default query retries make protected-route "am I logged in" checks show a stuck spinner for several seconds; disable retry for those.
- [LLM multi-block code-fence extraction](llm-fenced-block-extraction.md) — extracting a second fenced block (e.g. JSON IDL after Rust code) via string indexing is fragile; parse all fences with one regex and pick by language tag.
- [fetch-based API client error shape](fetch-mutator-error-shape.md) — an Orval fetch mutator throws `ApiError` with a `.data` field, not axios's `.response.data`; using axios-shaped error access silently swallows server error messages.
- [Stale query cache causes login/logout redirect loops](query-cache-logout-redirect-loop.md) — logging out without clearing the cached "current user" query lets stale truthy data survive into the next page's redirect effect, causing a `/` ↔ `/dashboard` bounce loop.
- [New pipeline status values need OpenAPI enum updates](pipeline-status-enum-sync.md) — adding a new status value to a DB text column (e.g. a new job phase) 500s every list/get endpoint until the OpenAPI/Zod response enum is updated too.
- [New DB column breaks hand-mapped list endpoints](hand-mapped-list-endpoint-new-column.md) — adding a required field to an OpenAPI response schema 500s any route that hand-builds its response object field-by-field instead of spreading the row.
- [drizzle-kit push vs runtime-managed tables](drizzle-push-runtime-table-exclusion.md) — `drizzle-kit push` proposes dropping tables a library creates at runtime (e.g. connect-pg-simple's session table) unless excluded via `tablesFilter`.
- [Forge hardening context-question flow](forge-hardening-context-question.md) — when hardening stalls below target, the auditor can ask the user a specific context question instead of just retrying blindly.
