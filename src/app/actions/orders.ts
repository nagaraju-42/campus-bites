'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getShopActiveOrdersAdmin(shopId: string) {
  const { data: partnerItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id')
    .eq('partner_shop_id', shopId)
    
  const partnerOrderIds = partnerItems?.map(item => item.order_id) || []
  const orderIdsFilter = partnerOrderIds.length > 0 
    ? \id.in.(\)\ 
    : 'id.eq.00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items (*), student:profiles!student_id(full_name, phone)')
    .or(\shop_id.eq.\,\\)
    .in('status', ['pending', 'preparing', 'ready', 'out_for_delivery'])
    .order('placed_at', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function getShopOrderHistoryAdmin(shopId: string, limit: number = 50) {
  const { data: partnerItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id')
    .eq('partner_shop_id', shopId)
    
  const partnerOrderIds = partnerItems?.map(item => item.order_id) || []
  const orderIdsFilter = partnerOrderIds.length > 0 
    ? \id.in.(\)\ 
    : 'id.eq.00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items (*), student:profiles!student_id(full_name, phone)')
    .or(\shop_id.eq.\,\\)
    .in('status', ['delivered', 'cancelled'])
    .order('placed_at', { ascending: false })
    .limit(limit)
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function getOrderByIdAdmin(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items (*), student:profiles!student_id(full_name, phone)')
    .eq('id', orderId)
    .single()
    
  if (error) throw new Error(error.message)
  return data
}