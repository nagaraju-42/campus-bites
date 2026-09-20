'use server'

import { createClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co')
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
  
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

export async function adminRestoreMenuItem(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('menu_items').update({ 
    is_archived: false,
    is_available: false 
  }).eq('id', id)
  
  if (error) throw new Error(error.message)
}
export async function adminImportMenuItems(targetShopId: string, sourceItemIds: string[]) {
  const supabase = getSupabaseAdmin()
  
  if (!sourceItemIds.length) return;

  // Fetch the source items
  const { data: sourceItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('*')
    .in('id', sourceItemIds)

  if (fetchError) throw new Error(fetchError.message)
  if (!sourceItems || sourceItems.length === 0) return;

  // Prepare the new items
  const newItems = sourceItems.map(item => {
    const { id, created_at, ...rest } = item;
    return {
      ...rest,
      shop_id: targetShopId
    };
  })

  // Insert them
  const { error: insertError } = await supabase
    .from('menu_items')
    .insert(newItems)

  if (insertError) throw new Error(insertError.message)
}

