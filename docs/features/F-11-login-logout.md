# F-11: Login + Logout + Session Middleware

## Login
`POST /api/auth/login` — validates credentials via the server Supabase client
(sets session cookie), returns 200 + redirect destination.

| Status | Body |
|--------|------|
| 200 | `{ "redirectTo": "/admin" \| "/dashboard" \| "/pending-approval" }` |
| 401 | `{ "error": "Invalid email or password" }` |
| 422 | `{ "error": "Validation failed", "fields": { ... } }` |

## Logout
`POST /api/auth/logout` — calls `supabase.auth.signOut()`, clears session
cookie, returns 200.

## Session refresh (middleware)
`src/middleware.ts` calls `supabase.auth.getUser()` on every request, which
refreshes the session cookie if it is about to expire. This ensures the session
stays alive for active users without requiring a full page reload.

The route protection logic lives in F-12.
