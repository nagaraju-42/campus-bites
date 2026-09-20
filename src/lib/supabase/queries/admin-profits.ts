import { createClient } from '@/lib/supabase/client'

export async function getProfitAnalytics() {
  const supabase = createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      shop_id,
      platform_fee,
      delivery_fee,
      shops!orders_shop_id_fkey (name),
      order_items (
        item_name,
        quantity,
        unit_price,
        partner_shop_id,
        partner:shops!order_items_partner_shop_id_fkey (name)
      )
    `)
    .eq('status', 'delivered')
    .gte('delivered_at', today.toISOString())

  if (error) {
    console.error("Error fetching profits:", error)
    return { shopStats: [], totalPlatformProfit: 0 }
  }

  // Aggregate by shop and item
  const shopMap = new Map<string, any>()
  let totalPlatformProfit = 0

  orders.forEach(order => {
    // Add platform fee to total profit
    totalPlatformProfit += (order.platform_fee || 0)

    order.order_items.forEach((item: any) => {
      // Platform makes 10rs per item quantity
      const marginPerItem = 10
      const myProfit = marginPerItem * item.quantity
      totalPlatformProfit += myProfit

      // The shop that actually fulfills the item (partner shop if exists, else main shop)
      const actualShopName = item.partner?.name || ((order.shops as any)?.name || (Array.isArray(order.shops) ? (order.shops[0] as any)?.name : null)) || 'Unknown Shop'
      const actualShopId = item.partner_shop_id || order.shop_id
      
      const shopProfitPerItem = (item.unit_price - marginPerItem) * item.quantity

      if (!shopMap.has(actualShopId)) {
        shopMap.set(actualShopId, {
          shopName: actualShopName,
          items: new Map<string, any>(),
          totalShopProfit: 0,
          totalMyProfitFromShop: 0
        })
      }

      const shopStats = shopMap.get(actualShopId)
      shopStats.totalShopProfit += shopProfitPerItem
      shopStats.totalMyProfitFromShop += myProfit

      if (!shopStats.items.has(item.item_name)) {
        shopStats.items.set(item.item_name, {
          itemName: item.item_name,
          qtySold: 0,
          shopProfit: 0,
          myProfit: 0
        })
      }

      const itemStats = shopStats.items.get(item.item_name)
      itemStats.qtySold += item.quantity
      itemStats.shopProfit += shopProfitPerItem
      itemStats.myProfit += myProfit
    })
  })

  // Format map to array
  const formattedStats = Array.from(shopMap.values()).map(shop => ({
    shopName: shop.shopName,
    totalShopProfit: shop.totalShopProfit,
    totalMyProfitFromShop: shop.totalMyProfitFromShop,
    items: Array.from(shop.items.values()).sort((a: any, b: any) => b.qtySold - a.qtySold)
  })).sort((a: any, b: any) => b.totalMyProfitFromShop - a.totalMyProfitFromShop)

  return {
    shopStats: formattedStats,
    totalPlatformProfit
  }
}
