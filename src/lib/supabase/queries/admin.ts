import { createClient } from '@/lib/supabase/client'
import { PlatformMetrics, Promotion } from '@/types'

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  // 1. Total Revenue & Fees (from all delivered orders today)
  const { data: todayOrdersData } = await supabase
    .from('orders')
    .select('total_amount, platform_fee')
    .eq('status', 'delivered')
    .gte('delivered_at', today.toISOString())
  
  const totalRevenue = todayOrdersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
  const platformFeesEarned = todayOrdersData?.reduce((sum, o) => sum + (o.platform_fee || 0), 0) || 0
  const totalDeliveriesToday = todayOrdersData?.length || 0

  // 2. Active Shops
  const { count: activeShops } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true })
    .eq('is_open', true)

  // 3. 7-Day Chart Data
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('total_amount, delivered_at')
    .eq('status', 'delivered')
    .gte('delivered_at', sevenDaysAgo.toISOString())

  const chartData = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(sevenDaysAgo.getDate() + i)
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayStart = d.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    
    const dayRevenue = recentOrders?.filter(o => {
      if (!o.delivered_at) return false
      const time = new Date(o.delivered_at).getTime()
      return time >= dayStart && time < dayEnd
    }).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

    chartData.push({ day: dayStr, revenue: dayRevenue })
  }

  return {
    totalRevenue,
    platformFeesEarned,
    activeShops: activeShops || 0,
    totalDeliveriesToday,
    chartData
  }
}

export async function getAllShops() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('*, orders(id)')
    .eq('is_deleted', false) // Filter out soft-deleted shops
    .order('created_at', { ascending: false })
    
  if (error) throw new Error(error.message)
  
  return data.map(shop => ({
    ...shop,
    order_count: shop.orders ? shop.orders.length : 0
  }))
}

export async function softDeleteShop(shopId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shops')
    .update({ is_deleted: true, is_open: false })
    .eq('id', shopId)
  if (error) throw new Error(error.message)
}

export async function updateShopApproval(shopId: string, is_open: boolean) {
  const supabase = createClient()
  const updates: any = { is_open }
  if (is_open) {
    updates.status = 'approved'
  }
  const { error } = await supabase.from('shops').update(updates).eq('id', shopId)
  if (error) throw new Error(error.message)
}

export async function hideShop(shopId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('shops').update({ is_open: false, status: 'suspended' }).eq('id', shopId)
  if (error) throw new Error(error.message)
}

export async function updateShopDetails(shopId: string, updates: any) {
  const supabase = createClient()
  const { error } = await supabase.from('shops').update(updates).eq('id', shopId)
  if (error) throw new Error(error.message)
}

export async function getAllUsers() {
  const supabase = createClient()
  // Join profiles with student_profiles for extra data
  const { data, error } = await supabase
    .from('profiles')
    .select('*, student_profiles(college_name, hostel_name, room_number)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function updateUserProfile(userId: string, role: string, updates: any, studentUpdates?: any) {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw new Error(error.message)
  
  if (role === 'student' && studentUpdates) {
    const { error: studentError } = await supabase.from('student_profiles').update(studentUpdates).eq('id', userId)
    if (studentError) throw new Error(studentError.message)
  }
}

export async function updateUserStatus(userId: string, status: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function hardDeleteUser(userId: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
  if (error) throw new Error(error.message)
}

export async function getAllPromotions() {
  const supabase = createClient()
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createPromotion(promo: Omit<Promotion, 'id' | 'created_at'>) {
  const supabase = createClient()
  const { error } = await supabase.from('promotions').insert(promo)
  if (error) throw new Error(error.message)
}

export async function updatePromotion(id: string, updates: Partial<Promotion>) {
  const supabase = createClient()
  const { error } = await supabase.from('promotions').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deletePromotion(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ============================================================================
// PHASE 2: God Mode Orders & Dispute Resolution
// ============================================================================

export async function getAllPlatformOrders() {
  const supabase = createClient()
  
  // Fetch orders and shop names
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      shops:shop_id(name),
      order_items(*)
    `)
    .order('placed_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  if (!orders || orders.length === 0) return []

  // Fetch student profiles to avoid fk ambiguity
  const studentIds = [...new Set(orders.map(o => o.student_id).filter(Boolean))]
  let profiles: any[] = []
  if (studentIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', studentIds)
    if (profilesData) profiles = profilesData
  }

  // Combine
  return orders.map(order => ({
    ...order,
    student: profiles.find(p => p.id === order.student_id) || null
  }))
}

export async function logOrderAudit(orderId: string, userId: string, statusFrom: string, statusTo: string) {
  const supabase = createClient()
  await supabase.from('order_audit_logs').insert({
    order_id: orderId,
    changed_by_user_id: userId,
    status_from: statusFrom,
    status_to: statusTo
  })
}

export async function forceCancelOrder(orderId: string, adminId: string, reason: string) {
  const supabase = createClient()
  
  const { data: order } = await supabase.from('orders').select('status, special_note').eq('id', orderId).single()
  
  const appendReason = order?.special_note ? `${order.special_note} | Admin Cancel: ${reason}` : `Admin Cancel: ${reason}`
  
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', special_note: appendReason })
    .eq('id', orderId)
    
  if (error) throw new Error(error.message)
  
  await logOrderAudit(orderId, adminId, order?.status || 'unknown', 'cancelled')
}

export async function adminDeleteOrderItem(orderId: string, itemId: string, itemTotalCost: number, adminId: string, itemName: string) {
  const supabase = createClient()
  
  // 1. Delete item
  const { error: deleteError } = await supabase.from('order_items').delete().eq('id', itemId)
  if (deleteError) throw new Error(deleteError.message)
  
  // 2. Fetch current total
  const { data: order } = await supabase.from('orders').select('total_amount, special_note, status').eq('id', orderId).single()
  if (!order) throw new Error("Order not found")
  
  // 3. Update total
  const newTotal = Math.max(0, order.total_amount - itemTotalCost)
  const appendNote = order.special_note ? `${order.special_note} | Admin removed item: ${itemName}` : `Admin removed item: ${itemName}`
  
  const { error: updateError } = await supabase.from('orders').update({ total_amount: newTotal, special_note: appendNote }).eq('id', orderId)
  if (updateError) throw new Error(updateError.message)
  
  // 4. Log audit
  await logOrderAudit(orderId, adminId, order.status, order.status)
}

export async function getOrderAuditLogs(orderId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('order_audit_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []
  
  const userIds = [...new Set(data.map(l => l.changed_by_user_id).filter(Boolean))]
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: pData } = await supabase.from('profiles').select('id, full_name, role').in('id', userIds)
    if (pData) profiles = pData
  }
  
  return data.map(log => ({
    ...log,
    changed_by: profiles.find(p => p.id === log.changed_by_user_id) || null
  }))
}

// ============================================================================
// DELIVERY LOCATIONS (Stored in app_settings)
// ============================================================================

export async function getDeliveryLocations(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'delivery_locations')
    .single()
    
  if (!data || !data.value) return []
  try {
    return JSON.parse(data.value)
  } catch (e) {
    return []
  }
}

export async function setDeliveryLocations(locations: string[]) {
  const supabase = createClient()
  
  // Check if exists
  const { data: existing } = await supabase
    .from('app_settings')
    .select('key')
    .eq('key', 'delivery_locations')
    .single()
    
  if (existing) {
    const { error } = await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(locations) })
      .eq('key', 'delivery_locations')
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('app_settings')
      .insert({ key: 'delivery_locations', value: JSON.stringify(locations) })
    if (error) throw new Error(error.message)
  }
}

// ============================================================================
// PHASE 3: Busy Mode Audits
// ============================================================================

export async function getBusyModeAudits() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('busy_mode_audits')
    .select(`
      *,
      shops(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
    
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = [...new Set(data.map(d => d.toggled_by).filter(Boolean))]
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: pData } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
    if (pData) profiles = pData
  }

  return data.map(audit => ({
    ...audit,
    profiles: profiles.find(p => p.id === audit.toggled_by) || { full_name: 'Unknown' }
  }))
}

export async function wipeBusyModeAudits() {
  const supabase = createClient()
  const { error } = await supabase
    .from('busy_mode_audits')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all rows safely
    
  if (error) throw new Error(error.message)
}

export async function wipeOrderAuditLogs() {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('order_audit_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all rows safely
    
  if (error) throw new Error(error.message)
}
