'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM format

  useEffect(() => {
    fetchSettlements()
  }, [month])

  const fetchSettlements = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      const startDate = new Date(`${month}-01T00:00:00Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)

      // We want to find all delivered order items that belong to a partner shop
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          item_name,
          quantity,
          unit_price,
          partner_shop_id,
          orders!inner(
            status,
            delivered_at,
            shop_id,
            shops:shop_id(name)
          ),
          partner:partner_shop_id(name)
        `)
        .eq('orders.status', 'delivered')
        .not('partner_shop_id', 'is', null)
        .gte('orders.delivered_at', startDate.toISOString())
        .lt('orders.delivered_at', endDate.toISOString())

      if (error) throw error

      // Aggregate by Primary Shop -> Partner Shop
      const agg: Record<string, { primaryName: string, partnerName: string, amountOwed: number, orderCount: number }> = {}

      data?.forEach((item: any) => {
        // Skip unavailable items
        if (item.item_name && item.item_name.startsWith('[UNAVAILABLE]')) return
        
        const primaryId = item.orders.shop_id
        const partnerId = item.partner_shop_id
        const key = `${primaryId}-${partnerId}`

        if (!agg[key]) {
          agg[key] = {
            primaryName: item.orders.shops?.name || 'Unknown Primary',
            partnerName: item.partner?.name || 'Unknown Partner',
            amountOwed: 0,
            orderCount: 0
          }
        }
        
        agg[key].amountOwed += (item.quantity * item.unit_price)
        agg[key].orderCount += item.quantity 
      })

      setSettlements(Object.values(agg))
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Cross-Shop Settlements</h1>
          <p className="text-gray-500 mt-1">Track exact amounts owed between primary and partner shops.</p>
        </div>
        <div>
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 font-bold text-gray-700"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Calculating debts...</p>
        </div>
      ) : settlements.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <span className="text-5xl mb-4 block">🤝</span>
          <h3 className="text-xl font-bold text-gray-900">No debts this month</h3>
          <p className="text-gray-500 mt-2">No cross-shop orders were delivered in {month}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settlements.map((s, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Debt Overview</span>
                <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-bold uppercase">Pending</span>
              </div>
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500">Primary Shop (Owes Money)</p>
                <p className="text-lg font-bold text-gray-900">{s.primaryName}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500">Partner Shop (Owed Money)</p>
                <p className="text-lg font-bold text-gray-900">{s.partnerName}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Items Sold</p>
                  <p className="font-bold text-gray-700">{s.orderCount} items</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Debt</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(s.amountOwed)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
