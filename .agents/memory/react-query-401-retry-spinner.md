---
name: React Query default retry vs 401 session checks
description: Default TanStack Query retry behavior makes an "am I logged in" query show a loading spinner for several seconds before settling into the logged-out state.
---

A typical "check current session" query (e.g. `useGetCurrentUser` hitting `/api/auth/me`) that 401s when logged out will, under TanStack Query's default `retry: 3` with exponential backoff, keep `isLoading` true for several seconds (roughly 1s + 2s + 4s) before finally resolving to the error/logged-out state. On an auth-gated landing page that gates its whole render on `isLoading`, this shows a stuck full-screen spinner on every cold load for logged-out users — looks broken even though it eventually recovers.

**Why:** confirmed via screenshot — a fresh page load repeatedly showed only a spinner because the query was still retrying; disabling retries made the auth page render instantly.

**How to apply:** for any query used purely to gate an authenticated/unauthenticated UI branch (session checks, "does this exist" probes), set `retry: false` — either per-query or as a sane global default (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`) — so expected 401/404s resolve immediately instead of retrying.
