import { createClient } from '@/lib/supabase/client'

export async function getShopPayoutWatermarks(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'shop_payout_watermarks').single()
  try {
    return data?.value ? JSON.parse(data.value) : {}
  } catch (e) {
    return {}
  }
}

export async function markShopPaid(shopId: string) {
  const supabase = createClient()
  const watermarks = await getShopPayoutWatermarks()
  watermarks[shopId] = new Date().toISOString()
  
  await supabase.from('app_settings')
    .update({ value: JSON.stringify(watermarks) })
    .eq('key', 'shop_payout_watermarks')
}

export async function getDetailedFinancials() {
  const supabase = createClient()
  
  const [shopsData, ordersData, watermarksData] = await Promise.all([
    supabase.from('shops').select('*').eq('is_deleted', false),
    supabase.from('orders').select('shop_id, total_amount, delivery_fee, platform_fee, status, delivered_at').in('status', ['delivered']),
    getShopPayoutWatermarks()
  ])
  
  const shops = shopsData.data || []
  const orders = ordersData.data || []
  const watermarks = watermarksData
  
  let totalGMV = 0
  let totalDeliveryFees = 0
  let totalPlatformFees = 0
  let totalPendingPayouts = 0
  
  const shopBalances = shops.map(shop => {
    const shopOrders = orders.filter(o => o.shop_id === shop.id)
    const watermark = watermarks[shop.id] ? new Date(watermarks[shop.id]).getTime() : 0
    
    let grossSales = 0
    let deliveryFeesCollected = 0
    let platformFeesDeducted = 0
    let netOwed = 0
    
    shopOrders.forEach(o => {
      grossSales += (o.total_amount || 0)
      deliveryFeesCollected += (o.delivery_fee || 0)
      platformFeesDeducted += (o.platform_fee || 0)
      
      const orderTime = o.delivered_at ? new Date(o.delivered_at).getTime() : 0
      
      // If the order was delivered AFTER the last payout watermark, it is pending
      if (orderTime > watermark) {
        netOwed += ((o.total_amount || 0) - (o.delivery_fee || 0) - (o.platform_fee || 0))
      }
    })
    
    totalGMV += grossSales
    totalDeliveryFees += deliveryFeesCollected
    totalPlatformFees += platformFeesDeducted
    totalPendingPayouts += netOwed
    
    return {
      ...shop,
      grossSales,
      deliveryFeesCollected,
      platformFeesDeducted,
      netOwed,
      totalOrders: shopOrders.length
    }
  })
  
  return {
    totalGMV,
    totalDeliveryFees,
    totalPlatformFees,
    totalPendingPayouts,
    totalNetRevenue: totalDeliveryFees + totalPlatformFees,
    shopBalances: shopBalances.sort((a, b) => b.netOwed - a.netOwed) // Sort by most owed
  }
}

export async function getShopOwnerFinancials(shopId: string) {
  const supabase = createClient()
  
  const [ordersData, watermarksData] = await Promise.all([
    supabase.from('orders').select('total_amount, delivery_fee, platform_fee, status, delivered_at, placed_at, id, order_number').eq('shop_id', shopId).in('status', ['delivered']),
    getShopPayoutWatermarks()
  ])
  
  const orders = ordersData.data || []
  const watermark = watermarksData[shopId] ? new Date(watermarksData[shopId]).getTime() : 0
  
  let totalRevenue = 0
  let pendingPayout = 0
  let platformFeesPaid = 0
  
  const recentOrders = orders.sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()).slice(0, 10).map(o => {
    const isSettled = (o.delivered_at ? new Date(o.delivered_at).getTime() : 0) <= watermark
    const shopEarning = (o.total_amount || 0) - (o.delivery_fee || 0) - (o.platform_fee || 0)
    return {
      ...o,
      shopEarning,
      isSettled
    }
  })
  
  orders.forEach(o => {
    const shopEarning = (o.total_amount || 0) - (o.delivery_fee || 0) - (o.platform_fee || 0)
    totalRevenue += shopEarning
    platformFeesPaid += (o.platform_fee || 0)
    
    const orderTime = o.delivered_at ? new Date(o.delivered_at).getTime() : 0
    if (orderTime > watermark) {
      pendingPayout += shopEarning
    }
  })
  
  return {
    totalRevenue,
    pendingPayout,
    platformFeesPaid,
    lastPayoutDate: watermarksData[shopId] || null,
    recentOrders
  }
}
