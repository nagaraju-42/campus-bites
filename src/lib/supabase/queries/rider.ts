import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export async function getAvailableDeliveries(): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, shops(name, description)`)
    .eq('status', 'ready')
    .or('order_type.eq.delivery,order_type.is.null')
    .is('rider_id', null)
    .order('placed_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function claimDelivery(orderId: string, riderId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'out_for_delivery', rider_id: riderId })
    .eq('id', orderId)
    .is('rider_id', null)

  if (error) throw new Error(error.message)

  // Insert Audit Log
  const { logOrderAudit } = await import('./admin')
  await logOrderAudit(orderId, riderId, 'ready', 'out_for_delivery')
}

export async function completeDelivery(orderId: string, riderId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw new Error(error.message)

  // Insert Audit Log
  const { logOrderAudit } = await import('./admin')
  await logOrderAudit(orderId, riderId, 'out_for_delivery', 'delivered')
}

export async function getRiderEarnings(riderId: string) {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('orders')
    .select('delivery_fee')
    .eq('rider_id', riderId)
    .eq('status', 'delivered')

  if (error) throw new Error(error.message)
  
  const deliveriesCompleted = data.length
  const totalEarned = data.reduce((sum, order) => sum + (order.delivery_fee || 0), 0)
  
  return { deliveriesCompleted, totalEarned }
}

export async function getActiveDeliveries(riderId: string): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, shops(name), profiles!student_id(full_name, phone)`)
    .eq('rider_id', riderId)
    .eq('status', 'out_for_delivery')
    .or('order_type.eq.delivery,order_type.is.null')

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data || []
}
