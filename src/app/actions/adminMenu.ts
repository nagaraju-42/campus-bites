'use server'

import { createClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseServiceKey) {
    throw new Error('Service role key is missing on Vercel!')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function adminCreateMenuItem(shopId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('menu_items').insert({
    shop_id: shopId,
    name: 'New Item',
    price: 0,
    category: 'Uncategorized',
    is_veg: true,
    is_available: false,
    is_featured: false,
    is_archived: false,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function adminUpdateMenuItem(id: string, updates: any) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('menu_items').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminArchiveMenuItem(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('menu_items').update({ 
    is_archived: true, 
    is_available: false 
  }).eq('id', id)
  
  if (error) throw new Error(error.message)
}
