import { useEffect, useState } from 'react'
import { getProfitAnalytics } from '@/lib/supabase/queries/admin-profits'
import { formatCurrency } from '@/lib/utils'
import { IndianRupee, TrendingUp, Store } from 'lucide-react'

export default function ProfitAnalytics() {
  const [data, setData] = useState<{ shopStats: any[], totalPlatformProfit: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getProfitAnalytics().then(res => {
      setData(res)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Calculating today's profits...</div>
  }

  if (!data || data.shopStats.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <IndianRupee className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-bold text-gray-900">No Profits Yet Today</h3>
        <p className="text-gray-500 text-sm mt-1">When orders are delivered, profits will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Platform Total */}
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-emerald-100 font-bold mb-1 flex items-center gap-2">
              <TrendingUp size={18} /> Today's Total Platform Profit
            </p>
            <h2 className="text-4xl font-black">{formatCurrency(data.totalPlatformProfit)}</h2>
            <p className="text-xs text-emerald-200 mt-2 font-medium">Includes ₹10 markup per item + platform fees</p>
          </div>
          <div className="bg-white/20 p-4 rounded-full">
            <IndianRupee size={40} className="text-white" />
          </div>
        </div>
      </div>

      {/* Shop Breakdown */}
      <div className="grid grid-cols-1 gap-6">
        {data.shopStats.map((shop, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Store size={18} className="text-blue-500" /> {shop.shopName}
              </h3>
              <div className="flex gap-4 text-sm">
                <div className="text-right">
                  <p className="text-gray-500 text-xs font-bold">Shop Profit</p>
                  <p className="font-black text-gray-800">{formatCurrency(shop.totalShopProfit)}</p>
                </div>
                <div className="text-right border-l pl-4 border-gray-200">
                  <p className="text-emerald-600 text-xs font-bold">My Profit</p>
                  <p className="font-black text-emerald-600">{formatCurrency(shop.totalMyProfitFromShop)}</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-400 font-bold border-b border-gray-100 text-xs">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3 text-center">Qty Sold</th>
                    <th className="px-4 py-3 text-right">Shop Earnings</th>
                    <th className="px-4 py-3 text-right">My Cut (₹10/item)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shop.items.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-600">{item.qtySold}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-600">{formatCurrency(item.shopProfit)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">+{formatCurrency(item.myProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}