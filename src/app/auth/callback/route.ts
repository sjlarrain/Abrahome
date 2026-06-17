import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publicEnv } from '@/lib/env'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const redirectBase = publicEnv.appUrl

  if (!code) {
    return NextResponse.redirect(`${redirectBase}/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange error:', error)
    return NextResponse.redirect(`${redirectBase}/login?error=invalid_link`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${redirectBase}/login?error=invalid_link`)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${redirectBase}/login?error=invalid_link`)
  }

  if (!profile.is_approved) {
    return NextResponse.redirect(`${redirectBase}/pending-approval`)
  }

  if (profile.role === 'admin') {
    return NextResponse.redirect(`${redirectBase}/admin`)
  }

  // next param is used when middleware redirected to login; honour it
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${redirectBase}${safeNext}`)
}
