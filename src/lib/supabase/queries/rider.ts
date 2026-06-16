import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export async function getAvailableDeliveries(): Promise<Order[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`*, shops(name, description), order_items(*, partner:partner_shop_id(name), menu_items(name))`)
      .eq('status', 'ready')
      .or('order_type.eq.delivery,order_type.is.null')
      .is('rider_id', null)
      .order('placed_at', { ascending: true })

    if (error) {
      console.error(error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Failed to fetch available deliveries:', err)
    return []
  }
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
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`*, shops(name), profiles!student_id(full_name, phone), order_items(*, partner:partner_shop_id(name), menu_items(name))`)
      .eq('rider_id', riderId)
      .eq('status', 'out_for_delivery')
      .or('order_type.eq.delivery,order_type.is.null')

    if (error && error.code !== 'PGRST116') {
      console.error(error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Failed to fetch active deliveries:', err)
    return []
  }
}

export async function markPartnerItemUnavailable(
  orderId: string, 
  orderItemId: string, 
  itemName: string, 
  itemPrice: number, 
  itemQuantity: number,
  riderId: string,
  riderName: string
) {
  const supabase = createClient()
  
  // 1. Mark item as unavailable in order_items
  const { error: itemError } = await supabase
    .from('order_items')
    .update({ 
      item_name: `[UNAVAILABLE] ${itemName}`, 
      unit_price: 0 
    })
    .eq('id', orderItemId)
    
  if (itemError) throw new Error(itemError.message)

  // 2. Fetch current order to update total and note
  const { data: order } = await supabase
    .from('orders')
    .select('total_amount, special_note')
    .eq('id', orderId)
    .single()
    
  if (order) {
    const deductAmount = itemPrice * itemQuantity
    const newTotal = Math.max(0, order.total_amount - deductAmount)
    const auditNote = `\n⚠️ RIDER AUDIT: ${riderName} marked "${itemName}" as unavailable at partner shop. Fare reduced by ₹${deductAmount}.`
    const newNote = order.special_note ? order.special_note + auditNote : auditNote.trim()

    const { error: orderError } = await supabase
      .from('orders')
      .update({ total_amount: newTotal, special_note: newNote })
      .eq('id', orderId)

    if (orderError) throw new Error(orderError.message)
  }

  // 3. Log Audit
  try {
    const { logOrderAudit } = await import('./admin')
    await logOrderAudit(orderId, riderId, 'out_for_delivery', 'out_for_delivery') // status doesn't change, just auditing
  } catch(e) {}
}
