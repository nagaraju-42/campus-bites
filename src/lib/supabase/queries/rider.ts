import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export async function getAvailableDeliveries(): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, shops(name, description)`)
    .eq('status', 'ready')
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
}

export async function completeDelivery(orderId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
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

export async function getActiveDelivery(riderId: string): Promise<Order | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, shops(name)`)
    .eq('rider_id', riderId)
    .eq('status', 'out_for_delivery')
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data || null
}
