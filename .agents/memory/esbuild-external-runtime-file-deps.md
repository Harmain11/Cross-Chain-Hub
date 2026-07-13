---
name: esbuild + runtime file dependencies
description: Packages that read sibling files at runtime (via __dirname/require.resolve) break silently when esbuild-bundled into a single output file.
---

Some npm packages ship a JS entrypoint plus a sibling non-JS asset they read at runtime relative to their own file location (e.g. `connect-pg-simple` reads `table.sql` next to its `index.js` the first time it needs to create the sessions table). When esbuild bundles that package's code into one output file, the sibling asset is left behind — the require/readFile call still points at the *original* package path, but at runtime the code executes from the bundle's directory, so the file lookup 404s (`ENOENT`).

**Why:** hit this with `connect-pg-simple` + `express-session` inside an esbuild-bundled Express server: the API returned 200s that *looked* fine, but the session was silently never persisted (login worked, immediate `/me` check failed), and the real error (`ENOENT: table.sql`) only showed up in server logs, not in the HTTP response.

**How to apply:** if a backend build (esbuild/rollup/etc.) starts silently failing to persist something, or a package's docs mention it "ships SQL/config files alongside its JS", add that package to the bundler's `external` list so it stays a normal `node_modules` require and its relative file lookups keep working. Also worth externalizing packages like `solc` that dynamically load large embedded binaries/wasm.
