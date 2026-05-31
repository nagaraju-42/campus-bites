import { createClient } from '@/lib/supabase/client'
import { MenuItem } from '@/types'

export async function getMenuItemsByShop(shopId: string): Promise<MenuItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_available', true)
    .order('category', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAllMenuItemsByShop(shopId: string): Promise<MenuItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addMenuItem(item: Partial<MenuItem>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .insert(item)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  return data
}


// Groups items by category
export function groupMenuByCategory(items: MenuItem[]) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)
}
