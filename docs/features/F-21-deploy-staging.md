# F-21: Deploy Staging to Vercel

## Steps (manual — no code required)

1. Push the `main` branch to GitHub (or connect the repo if not already).
2. Import the project in Vercel → Framework: Next.js, Root: `.`
3. Set all environment variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL` (set to the Vercel preview URL initially)
   - `ADMIN_BOOTSTRAP_EMAIL`
4. In Supabase → Authentication → URL Configuration:
   - Add the Vercel URL to **Site URL**
   - Add `https://<your-vercel-url>/auth/callback` to **Redirect URLs**
5. Deploy. Visit the URL and register with `ADMIN_BOOTSTRAP_EMAIL` to bootstrap.

## Phase 1 exit criteria check
- [ ] Bootstrap admin can log in
- [ ] Any user can register, verify email, wait for approval
- [ ] Admin can approve users, set up house config (with timezone)
- [ ] Admin can create families and provision member logins
- [ ] Staging deployed on Vercel
