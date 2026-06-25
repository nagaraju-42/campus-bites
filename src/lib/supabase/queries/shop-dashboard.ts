import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { sendOrderPushAction } from '@/app/actions/push'

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

export async function createShopProfile(ownerId: string, shopName: string, phone: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: ownerId,
      name: shopName,
      phone: phone,
      is_open: false
    })
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  return data
}

export async function updateProfilePhone(userId: string, phone: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', userId)
    
  if (error) throw new Error(error.message)
}

export async function toggleBusyModeDB(shopId: string, isBusy: boolean, userId: string) {
  const supabase = createClient()
  
  // 1. Update shop
  const { error: shopError } = await supabase
    .from('shops')
    .update({ busy_mode: isBusy })
    .eq('id', shopId)
    
  if (shopError) throw new Error(shopError.message)
  
  // 2. Insert audit log
  await supabase
    .from('busy_mode_audits')
    .insert({ shop_id: shopId, is_busy: isBusy, toggled_by: userId })
}

export async function getShopActiveOrders(shopId: string): Promise<Order[]> {
  const supabase = createClient()
  
  // Find orders where this shop is a partner
  const { data: partnerItems } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('partner_shop_id', shopId)
    
  const partnerOrderIds = partnerItems?.map(item => item.order_id) || []
  const orderIdsFilter = partnerOrderIds.length > 0 
    ? `id.in.(${partnerOrderIds.join(',')})` 
    : 'id.eq.00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*), student:profiles!orders_student_id_fkey(full_name, phone)`)
    .or(`shop_id.eq.${shopId},${orderIdsFilter}`)
    .in('status', ['pending', 'preparing', 'ready'])
    .order('placed_at', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function getShopOrderHistory(shopId: string, limit: number = 50): Promise<Order[]> {
  const supabase = createClient()

  // Find orders where this shop is a partner
  const { data: partnerItems } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('partner_shop_id', shopId)
    
  const partnerOrderIds = partnerItems?.map(item => item.order_id) || []
  const orderIdsFilter = partnerOrderIds.length > 0 
    ? `id.in.(${partnerOrderIds.join(',')})` 
    : 'id.eq.00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*), student:profiles!orders_student_id_fkey(full_name, phone)`)
    .or(`shop_id.eq.${shopId},${orderIdsFilter}`)
    .in('status', ['delivered', 'cancelled'])
    .order('placed_at', { ascending: false })
    .limit(limit)
    
  if (error) throw new Error(error.message)
  return data || []
}

export async function markItemUnavailableAsShop(orderId: string, itemId: string, itemPrice: number, quantity: number, currentTotal: number) {
  const supabase = createClient()
  
  // 1. Update order item name to prepend [UNAVAILABLE]
  const { data: itemData, error: itemError } = await supabase
    .from('order_items')
    .select('item_name')
    .eq('id', itemId)
    .single()
    
  if (itemError) throw new Error(itemError.message)
  
  if (itemData.item_name.startsWith('[UNAVAILABLE]')) return // already marked
  
  const { error: updateItemError } = await supabase
    .from('order_items')
    .update({ item_name: `[UNAVAILABLE] ${itemData.item_name}` })
    .eq('id', itemId)
    
  if (updateItemError) throw new Error(updateItemError.message)
  
  // 2. Reduce the total order amount
  const newTotal = Math.max(0, currentTotal - (itemPrice * quantity))
  
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ total_amount: newTotal })
    .eq('id', orderId)
    
  if (updateOrderError) throw new Error(updateOrderError.message)
}

import { logOrderAudit } from './admin'

export async function updateOrderStatusDB(orderId: string, status: string, userId?: string) {
  const supabase = createClient()
  
  // Get current status and rider
  const { data: order } = await supabase.from('orders').select('status, rider_id, student_id, order_number').eq('id', orderId).single()
  
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

  // Send notification to student if accepted (preparing)
  if (status === 'preparing' && order?.student_id) {
    try {
      await supabase.from('notifications').insert({
        user_id: order.student_id,
        title: 'Order Accepted! 🍳',
        message: `Order #${order.order_number} has been accepted and is now being prepared.`,
        type: 'order_update'
      })
    } catch (e) {}
  }
  
  // Send push notification to rider if marked ready
  if (status === 'ready' && order?.rider_id) {
    try {
      await sendOrderPushAction(
        order.rider_id, 
        '🍔 Order Ready for Pickup!', 
        `Order is ready at the shop. Please pick it up.`
      );
    } catch (e) {
      console.error("Push error:", e);
    }
  }
  
  // Log audit
  if (order?.status && order.status !== status) {
    try {
      await logOrderAudit(orderId, userId || '00000000-0000-0000-0000-000000000000', order.status, status)
    } catch (e) {
      console.error("Failed to log audit:", e)
    }
  }
}

export async function updateShopStatusDB(shopId: string, is_open: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shops')
    .update({ is_open })
    .eq('id', shopId)
    
  if (error) throw new Error(error.message)
}

export async function getShopStats(shopId: string, timeRange: 'today' | 'yesterday' | 'week' | 'month' | 'all_time') {
  const supabase = createClient()
  
  let startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  
  let endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)
  
  if (timeRange === 'yesterday') {
    startDate.setDate(startDate.getDate() - 1)
    endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 1)
  } else if (timeRange === 'week') {
    startDate.setDate(startDate.getDate() - 7)
    endDate = new Date()
  } else if (timeRange === 'month') {
    startDate.setMonth(startDate.getMonth() - 1)
    endDate = new Date()
  }

  let query = supabase
    .from('orders')
    .select('total_amount, status')
    .eq('shop_id', shopId)
    
  if (timeRange !== 'all_time') {
    query = query.gte('placed_at', startDate.toISOString()).lt('placed_at', endDate.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  
  const completed = data?.filter(o => o.status === 'delivered') || []
  const cancelled = data?.filter(o => o.status === 'cancelled') || []
  
  const revenue = completed.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  
  return {
    revenue,
    orders: completed.length,
    cancelled: cancelled.length,
    avgValue: completed.length > 0 ? revenue / completed.length : 0
  }
}

export async function cancelOrderAsShop(orderId: string, shopOwnerId: string, reason: string) {
  const supabase = createClient()
  
  const { data: order } = await supabase.from('orders').select('status, special_note, student_id').eq('id', orderId).single()
  const appendReason = order?.special_note ? `${order.special_note} | Shop Cancel: ${reason}` : `Shop Cancel: ${reason}`
  
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', special_note: appendReason })
    .eq('id', orderId)
    
  if (error) throw new Error(error.message)
  
  try {
    await logOrderAudit(orderId, shopOwnerId, order?.status || 'unknown', 'cancelled')
  } catch(e) {}
  
  // Send notification to student
  if (order?.student_id) {
    try {
      await supabase.from('notifications').insert({
        user_id: order.student_id,
        title: 'Order Cancelled 🚫',
        message: `Your order was cancelled by the shop. Reason: ${reason}. Please contact them for details.`,
        type: 'alert'
      })
    } catch(e) {}
  }
}

export async function markCashCollected(shopId: string, riderId: string, amount: number, dateStr: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('rider_settlements')
    .insert({
      shop_id: shopId,
      rider_id: riderId,
      amount,
      date: dateStr
    })
  if (error) throw new Error(error.message)
}

export async function getRiderSettlements(shopId: string, dateStr: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rider_settlements')
    .select('*, rider:rider_id(full_name)')
    .eq('shop_id', shopId)
    .eq('date', dateStr)
  if (error) throw new Error(error.message)
  return data || []
}

export async function approveRiderSettlement(settlementId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('rider_settlements')
    .update({ status: 'approved' })
    .eq('id', settlementId)
  if (error) throw new Error(error.message)
}

export async function settleUpWithPartner(primaryShopId: string, partnerShopId: string, amount: number, monthStr: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shop_settlements')
    .insert({
      primary_shop_id: primaryShopId,
      partner_shop_id: partnerShopId,
      amount,
      settled_month: monthStr
    })
  if (error) throw new Error(error.message)
}

export async function getShopSettlements(shopId: string, monthStr: string) {
  const supabase = createClient()
  // Shop could be primary or partner
  const { data, error } = await supabase
    .from('shop_settlements')
    .select('*')
    .eq('settled_month', monthStr)
    .or(`primary_shop_id.eq.${shopId},partner_shop_id.eq.${shopId}`)
  
  if (error) throw new Error(error.message)
  return data || []
}
