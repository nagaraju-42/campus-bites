'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function getAllRidersAdmin() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'rider')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    
  if (error) throw new Error(error.message)
  return data || []
}
