# F-12: Role-Based Route Protection Middleware

## What it does
`src/middleware.ts` runs on every non-static request. It:
1. Refreshes the Supabase session cookie (keeping active sessions alive)
2. Enforces route access based on auth state + role

## Route rules

| Path pattern | Unauthenticated | Authenticated (unapproved) | Approved family | Admin |
|---|---|---|---|---|
| `/login`, `/register`, `/verify-email` | allow | redirect → role dest | redirect → `/dashboard` | redirect → `/admin` |
| `/pending-approval` | redirect → `/login` | allow | redirect → `/dashboard` | redirect → `/admin` |
| `/admin/**` | redirect → `/login` | redirect → `/pending-approval` | redirect → `/dashboard` | allow |
| `/dashboard/**` | redirect → `/login` | redirect → `/pending-approval` | allow | allow |
| `/auth/callback` | allow | allow | allow | allow |
| everything else | allow | allow | allow | allow |

## Profile fetch strategy
The middleware reads `user_profiles` via the server client (anon key + RLS).
The `up_select` policy allows `id = auth.uid()`, so the user can always read
their own profile. No service-role key is needed here.
