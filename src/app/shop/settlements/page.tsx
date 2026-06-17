'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ShopSettlementsPage() {
  const { user } = useAuthStore()
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [youOwe, setYouOwe] = useState<any[]>([])
  const [owedToYou, setOwedToYou] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM format

  useEffect(() => {
    async function getShop() {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
      if (data) setShopId(data.id)
    }
    getShop()
  }, [user])

  useEffect(() => {
    if (shopId) {
      fetchSettlements()
    }
  }, [shopId, month])

  const fetchSettlements = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const startDate = new Date(`${month}-01T00:00:00Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)

      // Query 1: Money YOU OWE to partners (You are primary shop)
      const { data: youOweData, error: err1 } = await supabase
        .from('order_items')
        .select(`
          item_name, quantity, unit_price, partner_shop_id,
          orders!inner(status, delivered_at, shop_id),
          partner:partner_shop_id(name)
        `)
        .eq('orders.status', 'delivered')
        .eq('orders.shop_id', shopId)
        .not('partner_shop_id', 'is', null)
        .neq('partner_shop_id', shopId)
        .gte('orders.delivered_at', startDate.toISOString())
        .lt('orders.delivered_at', endDate.toISOString())

      if (err1) throw err1

      // Fetch settled amounts
      const { getShopSettlements } = await import('@/lib/supabase/queries/shop-dashboard')
      const settlements = await getShopSettlements(shopId!, month)
      
      const settledAmounts: Record<string, number> = {}
      settlements.forEach((s: any) => {
        if (s.primary_shop_id === shopId) {
          settledAmounts[s.partner_shop_id] = (settledAmounts[s.partner_shop_id] || 0) + Number(s.amount)
        }
      })

      // Aggregate You Owe
      const youOweAgg: Record<string, { partnerId: string, partnerName: string, amount: number, count: number }> = {}
      youOweData?.forEach((item: any) => {
        if (item.item_name && item.item_name.startsWith('[UNAVAILABLE]')) return
        const pId = item.partner_shop_id
        if (!youOweAgg[pId]) {
          youOweAgg[pId] = { partnerId: pId, partnerName: item.partner?.name || 'Unknown', amount: 0, count: 0 }
        }
        youOweAgg[pId].amount += (item.quantity * item.unit_price)
        youOweAgg[pId].count += item.quantity
      })
      
      // Subtract settled amounts
      Object.keys(youOweAgg).forEach(pId => {
        if (settledAmounts[pId]) {
          youOweAgg[pId].amount = Math.max(0, youOweAgg[pId].amount - settledAmounts[pId])
        }
      })
      
      setYouOwe(Object.values(youOweAgg))

      // Query 2: Money OWED TO YOU (You are partner shop)
      const { data: owedData, error: err2 } = await supabase
        .from('order_items')
        .select(`
          item_name, quantity, unit_price,
          orders!inner(status, delivered_at, shop_id, shops:shop_id(name))
        `)
        .eq('orders.status', 'delivered')
        .eq('partner_shop_id', shopId)
        .gte('orders.delivered_at', startDate.toISOString())
        .lt('orders.delivered_at', endDate.toISOString())

      if (err2) throw err2

      // Aggregate Owed To You
      const owedAgg: Record<string, { primaryName: string, amount: number, count: number }> = {}
      owedData?.forEach((item: any) => {
        if (item.item_name && item.item_name.startsWith('[UNAVAILABLE]')) return
        const pId = item.orders.shop_id
        if (!owedAgg[pId]) {
          owedAgg[pId] = { primaryName: item.orders.shops?.name || 'Unknown', amount: 0, count: 0 }
        }
        owedAgg[pId].amount += (item.quantity * item.unit_price)
        owedAgg[pId].count += item.quantity
      })
      
      const receivedAmounts: Record<string, number> = {}
      settlements.forEach((s: any) => {
        if (s.partner_shop_id === shopId) {
          receivedAmounts[s.primary_shop_id] = (receivedAmounts[s.primary_shop_id] || 0) + Number(s.amount)
        }
      })

      Object.keys(owedAgg).forEach(pId => {
        if (receivedAmounts[pId]) {
          owedAgg[pId].amount = Math.max(0, owedAgg[pId].amount - receivedAmounts[pId])
        }
      })
      
      setOwedToYou(Object.values(owedAgg))

    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalYouOwe = youOwe.reduce((sum, item) => sum + item.amount, 0)
  const totalOwedToYou = owedToYou.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Partner Settlements</h1>
          <p className="text-gray-500 mt-1">Track money owed to you and money you owe to partners.</p>
        </div>
        <input 
          type="month" 
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2 font-bold text-gray-700 shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Calculating settlements...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <ArrowUpRight size={24} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Total You Owe</h3>
              </div>
              <p className="text-4xl font-bold text-red-700">{formatCurrency(totalYouOwe)}</p>
              <p className="text-red-500/80 text-sm font-medium mt-2">Cash collected by your riders for partner items.</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-3 text-green-600 mb-2">
                <ArrowDownLeft size={24} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Total Owed To You</h3>
              </div>
              <p className="text-4xl font-bold text-green-700">{formatCurrency(totalOwedToYou)}</p>
              <p className="text-green-600/80 text-sm font-medium mt-2">Your items delivered and collected by primary shops.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* You Owe Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Pay To Partners
              </h2>
              {youOwe.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-500 italic">
                  No pending payouts for {month}.
                </div>
              ) : (
                <div className="space-y-4">
                  {youOwe.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{item.partnerName}</p>
                        <p className="text-sm text-gray-500">{item.count} items sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-600">{formatCurrency(item.amount)}</p>
                        {item.amount > 0 ? (
                          <button 
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to mark ${formatCurrency(item.amount)} as settled with ${item.partnerName}?`)) return;
                              try {
                                const { settleUpWithPartner } = await import('@/lib/supabase/queries/shop-dashboard');
                                await settleUpWithPartner(shopId!, item.partnerId, item.amount, month);
                                fetchSettlements(); // Refresh
                                toast.success('Settled successfully!');
                              } catch (e: any) {
                                toast.error(e.message);
                              }
                            }}
                            className="text-xs font-bold text-red-500 uppercase tracking-wider mt-1 hover:underline cursor-pointer"
                          >
                            Settle Up
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1 flex items-center gap-1 justify-end">
                            Settled ✅
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Owed To You Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Collect From Partners
              </h2>
              {owedToYou.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-500 italic">
                  No pending collections for {month}.
                </div>
              ) : (
                <div className="space-y-4">
                  {owedToYou.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{item.primaryName}</p>
                        <p className="text-sm text-gray-500">{item.count} items sold</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">{formatCurrency(item.amount)}</p>
                        <button className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1 hover:underline">Remind</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
