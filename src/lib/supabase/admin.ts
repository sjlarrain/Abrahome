import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env, publicEnv } from '@/lib/env'

/**
 * Service-role Supabase client. **Bypasses RLS** — use only in trusted server
 * code (API routes performing privileged writes: approvals, assignments, the
 * atomic booking RPC, etc.). Never import this into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
