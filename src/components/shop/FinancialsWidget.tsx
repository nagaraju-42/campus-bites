import { useEffect, useState } from 'react'
import { getShopOwnerFinancials } from '@/lib/supabase/queries/financials'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Banknote, TrendingUp, AlertCircle, Clock } from 'lucide-react'

export default function FinancialsWidget({ shopId }: { shopId: string }) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const finData = await getShopOwnerFinancials(shopId)
        setData(finData)
      } catch (err) {
        console.error("Failed to load financials", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shopId])

  if (isLoading) {
    return <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse h-40"></div>
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <h2 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
        <span className="flex items-center gap-2"><Banknote className="text-emerald-500" size={20} /> Earnings & Payouts</span>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Live Data</span>
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Lifetime Revenue</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data?.totalRevenue || 0)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${data?.pendingPayout > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-[10px] uppercase font-bold mb-1 ${data?.pendingPayout > 0 ? 'text-orange-600' : 'text-gray-500'}`}>Pending Payout (Owed)</p>
          <p className={`text-2xl font-bold ${data?.pendingPayout > 0 ? 'text-orange-700' : 'text-gray-700'}`}>{formatCurrency(data?.pendingPayout || 0)}</p>
          {data?.pendingPayout === 0 && <p className="text-[10px] text-gray-400 mt-1">All settled up!</p>}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Order Earnings</h3>
        <div className="space-y-3 overflow-y-auto max-h-[150px] pr-2">
          {data?.recentOrders?.length === 0 ? (
            <p className="text-gray-400 text-xs">No orders yet.</p>
          ) : (
            data?.recentOrders?.map((order: any) => (
              <div key={order.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                <div>
                  <p className="font-bold text-xs text-gray-900">{order.order_number}</p>
                  <p className="text-[10px] text-gray-500">{formatDate(order.placed_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-emerald-600">+{formatCurrency(order.shopEarning)}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${order.isSettled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {order.isSettled ? 'Paid Out' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {data?.lastPayoutDate && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-medium text-gray-500">
          <Clock size={14} />
          <span>Last payout settlement on {formatDate(data.lastPayoutDate)}</span>
        </div>
      )}
    </div>
  )
}
