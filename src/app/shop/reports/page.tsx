'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Wallet, CreditCard, Banknote, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ShopReportsPage() {
  const { user } = useAuthStore()
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [period, setPeriod] = useState<'daily'|'weekly'>('daily')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)) // YYYY-MM-DD
  const [isLoading, setIsLoading] = useState(true)
  const [report, setReport] = useState<any>(null)

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
      fetchReport()
    }
  }, [shopId, date, period])

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      const startOfDay = new Date(`${date}T00:00:00+05:30`) // Assume IST timezone context for local shop
      const endOfDay = new Date(startOfDay)
      if (period === 'weekly') {
        // Find start of week (Monday)
        const day = startOfDay.getDay()
        const diff = startOfDay.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        startOfDay.setDate(diff)
        startOfDay.setHours(0, 0, 0, 0)
        
        endOfDay.setTime(startOfDay.getTime())
        endOfDay.setDate(endOfDay.getDate() + 7)
      } else {
        endOfDay.setDate(endOfDay.getDate() + 1)
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, total_amount, payment_method, status, delivered_at, rider_id,
          rider:rider_id(full_name)
        `)
        .eq('shop_id', shopId)
        .eq('status', 'delivered')
        .gte('delivered_at', startOfDay.toISOString())
        .lt('delivered_at', endOfDay.toISOString())

      if (error) throw error

      let totalCash = 0
      let totalUPI = 0
      const riderBreakdown: Record<string, { id: string, name: string, cashCollected: number, orderCount: number }> = {}

      data?.forEach((order: any) => {
        if (order.payment_method === 'cash_on_delivery') {
          totalCash += order.total_amount
          
          if (order.rider_id) {
            if (!riderBreakdown[order.rider_id]) {
              riderBreakdown[order.rider_id] = { id: order.rider_id, name: order.rider?.full_name || 'Unknown Rider', cashCollected: 0, orderCount: 0 }
            }
            riderBreakdown[order.rider_id].cashCollected += order.total_amount
            riderBreakdown[order.rider_id].orderCount += 1
          }
        } else if (order.payment_method === 'UPI' || order.payment_method === 'online') {
          totalUPI += order.total_amount
        }
      })

      // Fetch collected cash
      const { getRiderSettlements } = await import('@/lib/supabase/queries/shop-dashboard')
      const collected = await getRiderSettlements(shopId!, date)
      let totalCollected = 0
      collected.forEach((c: any) => {
        if (riderBreakdown[c.rider_id]) {
          riderBreakdown[c.rider_id].cashCollected = Math.max(0, riderBreakdown[c.rider_id].cashCollected - Number(c.amount))
        }
        totalCollected += Number(c.amount)
      })

      setReport({
        totalRevenue: totalCash + totalUPI,
        totalCash: Math.max(0, totalCash - totalCollected),
        totalUPI,
        orderCount: data?.length || 0,
        riders: Object.values(riderBreakdown)
      })

    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{period === 'daily' ? 'End of Day Report' : 'Weekly Report'}</h1>
          <p className="text-gray-500 mt-1">Review cash collected by riders and {period} earnings.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-1 rounded-md text-sm font-bold transition ${period === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-1 rounded-md text-sm font-bold transition ${period === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Weekly
            </button>
          </div>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-2 font-bold text-gray-700 shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Generating report...</p>
        </div>
      ) : !report ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 font-bold">No data available for this date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500 mb-2">
                <Wallet size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Total Sales</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.totalRevenue)}</p>
              <p className="text-gray-500 text-sm font-medium mt-1">{report.orderCount} orders delivered</p>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-6 border border-green-200 shadow-sm">
              <div className="flex items-center gap-3 text-green-700 mb-2">
                <Banknote size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Net Cash to Collect</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(report.totalCash)}</p>
              <p className="text-green-600/80 text-sm font-medium mt-1">Collect this physical cash from riders</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-3 text-blue-700 mb-2">
                <CreditCard size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wider">UPI / Online</h3>
              </div>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(report.totalUPI)}</p>
              <p className="text-blue-600/80 text-sm font-medium mt-1">Settled directly to bank</p>
            </div>
          </div>

          {/* Rider Breakdown */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={24} className="text-gray-400" />
                Rider Cash Collections
              </h2>
            </div>
            
            {report.riders.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-500 font-medium">No cash collected by riders today.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {report.riders.map((rider: any, idx: number) => (
                  <div key={idx} className="p-6 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{rider.name}</p>
                      <p className="text-sm text-gray-500">{rider.orderCount} cash orders delivered</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(rider.cashCollected)}</p>
                      {rider.cashCollected > 0 ? (
                        <button 
                          onClick={async () => {
                            if (!confirm(`Confirm collection of ${formatCurrency(rider.cashCollected)} from ${rider.name}?`)) return;
                            try {
                              const { markCashCollected } = await import('@/lib/supabase/queries/shop-dashboard');
                              await markCashCollected(shopId!, rider.id, rider.cashCollected, date);
                              fetchReport();
                              toast.success('Cash collected successfully!');
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1 hover:underline cursor-pointer"
                        >
                          Mark Collected
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1 flex items-center gap-1 justify-end">
                          Collected ✅
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
