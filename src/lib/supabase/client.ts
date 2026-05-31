import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let globalClient: SupabaseClient | undefined

export function createClient() {
  if (globalClient) return globalClient

  globalClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )

  return globalClient
}

