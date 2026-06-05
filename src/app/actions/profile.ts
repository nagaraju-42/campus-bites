'use server'

import { createClient } from '@supabase/supabase-js'

export async function updateUserProfilePhoneAction(userId: string, phone: string, role: string, shopName?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // We use the service role key to bypass RLS, which ensures the update works flawlessly
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Update profiles table
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ phone })
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  // 2. Create shop if needed
  if (role === 'shop_owner' && shopName) {
    const { error: shopError } = await supabaseAdmin
      .from('shops')
      .insert({
        owner_id: userId,
        name: shopName,
        phone: phone,
        is_open: false
      })
    
    if (shopError) throw new Error(shopError.message)
  }
}
