import { createClient } from '@/lib/supabase/client'
import { Shop } from '@/types'

export async function getApprovedShops(): Promise<Shop[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('is_deleted', false)
    .order('is_open', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single()

  if (error) return null
  return data
}

export async function getPrimaryShopsForPartner(partnerShopId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shop_collaborations')
    .select('primary_shop_id, shops!shop_collaborations_primary_shop_id_fkey(id, name)')
    .eq('partner_shop_id', partnerShopId)
    .eq('is_active', true)

  if (error) return []
  return data ?? []
}
