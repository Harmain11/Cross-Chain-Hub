---
name: fetch-based Orval API client error shape
description: The custom-fetch Orval mutator throws ApiError with a .data field, not axios's .response.data — using axios-shaped access to read server error messages silently fails.
---

This monorepo's `@workspace/api-client-react` generated hooks use a `customFetch` mutator (see `lib/api-client-react/src/custom-fetch.ts`), not axios. On a non-2xx response it throws `ApiError` with `error.status`, `error.data` (parsed JSON/text body), and `error.message` (a synthesized summary) — there is no `error.response.data` like axios has.

**Why:** a frontend catch block written as `err.response?.data?.error` compiles fine (TS often infers `any` on catch) but always evaluates to `undefined`, so real server error messages (e.g. "password must be 8+ characters", "email already exists") were swallowed and replaced by a generic hardcoded fallback string — production behavior looked like "everything just fails with a vague message" even though the backend was returning specific, correct error text.

**How to apply:** in any catch block handling a generated API hook's mutation/query error in this stack, read `err?.data?.error` (or whatever field the OpenAPI error schema uses) with `err?.message` as fallback — never `err?.response?.data`. If a new codegen mutator is swapped in (e.g. back to axios), re-check this pattern across the frontend.
