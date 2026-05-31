import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export async function getShopDetailsByOwner(ownerId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
    
  if (error) throw new Error(error.message)
  return data
}

export async function getShopActiveOrders(shopId: string): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*)`)
    .eq('shop_id', shopId)
    .in('status', ['pending', 'preparing', 'ready'])
    .order('placed_at', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function getShopCompletedOrders(shopId: string, limit: number = 5): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*)`)
    .eq('shop_id', shopId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(limit)
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function updateOrderStatusDB(orderId: string, status: string) {
  const supabase = createClient()
  const updateData: any = { status }
  
  // If marking as delivered, set delivered_at
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    
  if (error) throw new Error(error.message)
}

export async function updateShopStatusDB(shopId: string, is_open: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shops')
    .update({ is_open })
    .eq('id', shopId)
    
  if (error) throw new Error(error.message)
}
