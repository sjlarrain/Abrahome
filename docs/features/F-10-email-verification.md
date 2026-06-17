# F-10: Email Verification Flow

## What it does
Supabase Auth sends a verification email after signup. The link redirects to
`/auth/callback?code=<pkce_code>`. The callback route exchanges the code for
a session, then routes the user to the right place:

| Condition | Redirect |
|-----------|----------|
| `is_approved = true` and `role = 'admin'` | `/admin` |
| `is_approved = true` | `/dashboard` |
| `is_approved = false` | `/pending-approval` |
| Exchange fails | `/login?error=invalid_link` |

## Implementation
Supabase PKCE flow: the code from the URL is exchanged via
`supabase.auth.exchangeCodeForSession(code)`.

## Not in scope
- Custom email templates (v2 — Resend is used for transactional email in later
  phases; verification email is the Supabase built-in for now)
