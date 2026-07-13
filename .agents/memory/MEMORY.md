# Memory Index

- [esbuild + connect-pg-simple](esbuild-external-runtime-file-deps.md) — packages that read sibling files (e.g. `table.sql`) at runtime via `__dirname` break when esbuild-bundled; must be externalized.
- [React Query default retry vs 401](react-query-401-retry-spinner.md) — default query retries make protected-route "am I logged in" checks show a stuck spinner for several seconds; disable retry for those.
- [LLM multi-block code-fence extraction](llm-fenced-block-extraction.md) — extracting a second fenced block (e.g. JSON IDL after Rust code) via string indexing is fragile; parse all fences with one regex and pick by language tag.
