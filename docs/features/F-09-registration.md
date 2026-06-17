# F-09: User Registration

## What it does
New users submit name, email, password, and optional phone. Supabase Auth
creates the account and sends a verification email. A `user_profiles` row is
created with `is_approved: false` — UNLESS the email matches
`ADMIN_BOOTSTRAP_EMAIL`, in which case `role=admin, is_approved=true`.

## Inputs
`POST /api/auth/register`
```json
{ "fullName": "string", "email": "string", "password": "string", "phone?": "string" }
```

## Outputs
| Status | Body |
|--------|------|
| 201 | `{ "message": "Verification email sent" }` |
| 400 | `{ "error": "Email already registered" }` |
| 422 | `{ "error": "Validation failed", "fields": { ... } }` |
| 503 | `{ "error": "Registration failed. Please try again." }` |

## Bootstrap admin rule
If `email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase()`:
- `role` = `'admin'`
- `is_approved` = `true`
- `approved_at` = current timestamp

## Edge cases
- Email already in `auth.users` → 400
- `ADMIN_BOOTSTRAP_EMAIL` match → auto-admin, auto-approved
- Profile insert fails after auth user created → delete auth user, return 503
- Supabase Auth down → 503

## Not in scope
- Social login (v3)
- Phone verification (v3)

## UI flow
1. User visits `/register`, fills out the form
2. On success → redirect to `/verify-email` (static "check your inbox" page)
3. On 400 → show "Email already registered" inline
4. On 422 → show per-field errors inline
