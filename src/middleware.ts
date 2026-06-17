import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = new Set(['/login', '/register', '/verify-email', '/auth/callback'])
const ADMIN_PREFIX = '/admin'
const DASHBOARD_PREFIX = '/dashboard'
const PENDING_PATH = '/pending-approval'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  // Build a server Supabase client that can read+write the session cookie.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Always call getUser() — this refreshes the session cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.has(pathname)
  const isAdmin = pathname.startsWith(ADMIN_PREFIX)
  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX)
  const isPending = pathname === PENDING_PATH

  // Unauthenticated
  if (!user) {
    if (isPublic) return response
    return redirectTo(request, '/login')
  }

  // Fetch the user's profile (own row — always readable via RLS)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('id', user.id)
    .single()

  const approved = profile?.is_approved ?? false
  const role = profile?.role ?? 'family_member'
  const dest = role === 'admin' ? '/admin' : '/dashboard'

  // Auth pages: redirect already-authenticated users away
  if (isPublic && pathname !== '/auth/callback') {
    if (!approved) return redirectTo(request, PENDING_PATH)
    return redirectTo(request, dest)
  }

  // Pending-approval page
  if (isPending) {
    if (approved) return redirectTo(request, dest)
    return response
  }

  // Protected routes for unapproved users
  if (!approved) return redirectTo(request, PENDING_PATH)

  // Admin-only routes
  if (isAdmin && role !== 'admin') return redirectTo(request, '/dashboard')

  // Dashboard is allowed for any approved user
  if (isDashboard) return response

  return response
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  url.pathname = path
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
