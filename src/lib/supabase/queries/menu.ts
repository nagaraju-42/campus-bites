import { createClient } from '@/lib/supabase/client'
import { MenuItem } from '@/types'

export async function getMenuItemsByShop(shopId: string): Promise<MenuItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .neq('is_archived', true)
    .order('category', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCollaborativeMenuItems(shopId: string): Promise<{ items: MenuItem[], partnerShops: any[] }> {
  const supabase = createClient()
  
  // 1. Fetch main shop items
  const { data: mainItems, error: mainError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .neq('is_archived', true)

  if (mainError) throw new Error(mainError.message)

  // 2. Check for active collaborations
  const { data: collabs } = await supabase
    .from('shop_collaborations')
    .select('partner_shop_id, shops!shop_collaborations_partner_shop_id_fkey(name)')
    .eq('primary_shop_id', shopId)
    .eq('is_active', true)

  let allItems = mainItems ?? []
  let partnerShops = []

  // 3. Fetch partner items if any
  if (collabs && collabs.length > 0) {
    for (const collab of collabs) {
      if (collab.partner_shop_id) {
        partnerShops.push(collab.shops)
        const { data: partnerItems } = await supabase
          .from('menu_items')
          .select('*')
          .eq('shop_id', collab.partner_shop_id)
          .neq('is_archived', true)
        
        if (partnerItems) {
          // Tag them for UI grouping if needed, but they are just MenuItems
          const tagged = partnerItems.map(item => ({
            ...item,
            partner_shop_name: (collab.shops as any)?.name
          }))
          allItems = [...allItems, ...tagged]
        }
      }
    }
  }

  // Sort by category
  allItems.sort((a, b) => (a.category_id || '').localeCompare(b.category_id || ''))

  return { items: allItems, partnerShops }
}

export async function getAllMenuItemsByShop(shopId: string): Promise<MenuItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .neq('is_archived', true)
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


export async function searchMenuItems(query: string): Promise<any[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      shops!inner(name, is_open)
    `)
    .ilike('name', `%${query}%`)
    .neq('is_archived', true)
    .eq('shops.is_open', true)
    .limit(20)

  if (error) {
    console.error("Search error:", error)
    return []
  }
  return data ?? []
}

// Groups items by category
export function groupMenuByCategory(items: MenuItem[]) {
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)

    if (item.is_featured) {
      if (!acc['Bestsellers']) acc['Bestsellers'] = []
      acc['Bestsellers'].push(item)
    }

    return acc
  }, {} as Record<string, MenuItem[]>)

  // Ensure Bestsellers is at the top
  const sortedGrouped: Record<string, MenuItem[]> = {}
  if (grouped['Bestsellers']) {
    sortedGrouped['Bestsellers'] = grouped['Bestsellers']
  }
  for (const key in grouped) {
    if (key !== 'Bestsellers') {
      sortedGrouped[key] = grouped[key]
    }
  }

  return sortedGrouped
}
