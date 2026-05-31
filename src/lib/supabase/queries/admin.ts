import { createClient } from '@/lib/supabase/client'
import { PlatformMetrics } from '@/types'

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. Total Revenue & Fees (from all delivered orders today)
  const { data: ordersData } = await supabase
    .from('orders')
    .select('total_amount, platform_fee')
    .eq('status', 'delivered')
    .gte('delivered_at', today.toISOString())
  
  const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
  const platformFeesEarned = ordersData?.reduce((sum, o) => sum + (o.platform_fee || 0), 0) || 0
  const totalDeliveriesToday = ordersData?.length || 0

  // 2. Active Shops
  const { count: activeShops } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true })
    .eq('is_open', true)

  return {
    totalRevenue,
    platformFeesEarned,
    activeShops: activeShops || 0,
    totalDeliveriesToday
  }
}

export async function getAllShops() {
  const supabase = createClient()
  const { data, error } = await supabase.from('shops').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function updateShopApproval(shopId: string, is_approved: boolean) {
  const supabase = createClient()
  // NOTE: Assuming we add an `is_approved` boolean to shops table. If not, we can toggle `is_open`.
  // For MVP, we will just force toggle is_open for them if we don't have is_approved.
  const { error } = await supabase.from('shops').update({ is_open: is_approved }).eq('id', shopId)
  if (error) throw new Error(error.message)
}

export async function getAllUsers() {
  const supabase = createClient()
  // Join profiles with student_profiles for extra data
  const { data, error } = await supabase
    .from('profiles')
    .select('*, student_profiles(college_name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
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
