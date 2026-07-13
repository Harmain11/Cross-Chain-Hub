---
name: Stale query cache causes login/logout redirect loops
description: Logging out without clearing the cached "current user" query lets stale truthy data survive into the next page's redirect effect, causing a rapid redirect loop between the public and protected routes.
---

A common pattern is: an auth page redirects to the protected route in a `useEffect` when `useGetCurrentUser()` returns truthy data, and the protected page redirects back to the auth page when that same query errors (401). If logging out only calls the logout mutation and navigates, without also clearing the query-client cache entry for "current user", the old cached `data` (from before logout) is still truthy on the very next render of the auth page — it hasn't refetched yet. That triggers redirect to the protected page, which mounts, the query eventually refetches and 401s, triggering the "redirect to auth" effect, and so on. In React this manifests as a "Maximum update depth exceeded" crash (rapid alternating navigation/re-render), not just a UX glitch.

**Why:** hit this directly — a logout button caused a hard React crash with `Maximum update depth exceeded` and a resulting `Invalid hook call` (React landing in a broken state) a few renders later.

**How to apply:** on logout, before navigating away, explicitly clear the cached auth-check query — e.g. `queryClient.setQueryData(getCurrentUserQueryKey, null)` and/or `queryClient.removeQueries({ queryKey: getCurrentUserQueryKey })` — so the very next render sees "no user" instead of stale cached data. Pair with `retry: false` on that query (see react-query-401-retry-spinner.md) so the corrected state resolves immediately.
