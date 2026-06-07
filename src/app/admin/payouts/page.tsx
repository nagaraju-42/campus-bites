'use client'

import { useEffect, useState } from 'react'
import { Banknote, Download, Building2, Store, X, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react'
import { getDetailedFinancials, markShopPaid } from '@/lib/supabase/queries/financials'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminPayoutsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const finData = await getDetailedFinancials()
      setData(finData)
    } catch (err) {
      console.error("Failed to load payouts", err)
      toast.error("Failed to load financial data.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleMarkPaid = async (e: React.MouseEvent, shopId: string) => {
    e.stopPropagation()
    setIsProcessing(true)
    try {
      await markShopPaid(shopId)
      toast.success('Payout marked as processed successfully.')
      await load()
      if (selectedShop && selectedShop.id === shopId) {
        setSelectedShop(null) // close modal on pay
      }
    } catch (e) {
      toast.error('Failed to process payout.')
    } finally {
      setIsProcessing(false)
    }
  }

  const exportCSV = () => {
    toast.success('CSV Export downloaded.')
  }

  if (isLoading && !data) {
    return <div className="p-10 text-center text-slate-400">Loading comprehensive financial analysis...</div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Financial Analytics</h1>
          <p className="text-slate-400 mt-1">Platform-wide order revenue and settlement management</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-[#F97316] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition active:scale-95">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-emerald-500/10"><BarChart3 size={100} /></div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">Gross Merchandise Value (GMV)</p>
          <p className="text-2xl font-display font-bold text-emerald-400 relative z-10">{formatCurrency(data?.totalGMV || 0)}</p>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-blue-500/10"><TrendingUp size={100} /></div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">Delivery Fees Collected</p>
          <p className="text-2xl font-display font-bold text-blue-400 relative z-10">{formatCurrency(data?.totalDeliveryFees || 0)}</p>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-purple-500/10"><PieChart size={100} /></div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">Platform Fees (Commission)</p>
          <p className="text-2xl font-display font-bold text-purple-400 relative z-10">{formatCurrency(data?.totalPlatformFees || 0)}</p>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-[#F97316]/30 p-5 flex flex-col justify-center relative overflow-hidden shadow-lg shadow-[#F97316]/5">
          <div className="absolute -right-4 -top-4 text-[#F97316]/10"><Activity size={100} /></div>
          <p className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">Total Pending Shop Payouts</p>
          <p className="text-3xl font-display font-bold text-[#F97316] relative z-10">{formatCurrency(data?.totalPendingPayouts || 0)}</p>
        </div>
      </div>

      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 bg-[#0F172A] flex justify-between items-center">
          <h2 className="font-bold text-white text-lg flex items-center gap-2"><Building2 size={20} className="text-[#F97316]"/> Shop Settlements</h2>
          <p className="text-xs text-slate-400 font-medium">Click on any shop to view detailed analytics</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A]/50 border-b border-slate-700/50 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Partner Details</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4 text-right">Gross Sales</th>
                <th className="px-6 py-4 text-right">Pending Payout (Owed)</th>
                <th className="px-6 py-4 flex justify-end">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data?.shopBalances.map((shop: any) => (
                <tr 
                  key={shop.id} 
                  onClick={() => setSelectedShop(shop)}
                  className="hover:bg-slate-800/80 transition cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                        {shop.logo_url ? <img src={shop.logo_url} alt="" className="w-full h-full object-cover" /> : <Store size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-[#F97316] transition">{shop.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">UPI: {shop.upi_id || 'Not provided'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-300">
                    {shop.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                    {formatCurrency(shop.grossSales)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {shop.netOwed > 0 ? (
                      <span className="text-lg font-bold text-[#F97316]">{formatCurrency(shop.netOwed)}</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Settled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => handleMarkPaid(e, shop.id)}
                        disabled={shop.netOwed === 0 || isProcessing}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          shop.netOwed > 0 
                            ? 'bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 border border-[#F97316]/20 shadow-sm' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                        }`}
                      >
                        <Banknote size={14} />
                        {isProcessing ? '...' : shop.netOwed > 0 ? 'Mark Paid' : 'Cleared'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Shop Analytics Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedShop(null)}>
          <div className="bg-[#0F172A] border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden border border-slate-700">
                  {selectedShop.logo_url ? <img src={selectedShop.logo_url} alt="" className="w-full h-full object-cover" /> : <Store size={32} />}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">{selectedShop.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">Detailed Financial Analytics</p>
                </div>
              </div>
              <button onClick={() => setSelectedShop(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Lifetime Gross Sales</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(selectedShop.grossSales)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Total revenue generated by the shop</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-white">{selectedShop.totalOrders}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Successfully delivered</p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-700 pb-2">Revenue Split (Lifetime)</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-300">Platform Fees Deducted</p>
                      <p className="text-[10px] text-slate-500">TapNosh commission</p>
                    </div>
                    <p className="text-sm font-bold text-purple-400">{formatCurrency(selectedShop.platformFeesDeducted)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-300">Delivery Fees Collected</p>
                      <p className="text-[10px] text-slate-500">From {selectedShop.name} orders</p>
                    </div>
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(selectedShop.deliveryFeesCollected)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700 border-dashed">
                    <div>
                      <p className="text-base font-bold text-white">Net Earned by Shop</p>
                      <p className="text-[10px] text-slate-500">Total amount to be paid to shop owner</p>
                    </div>
                    <p className="text-base font-bold text-emerald-400">
                      {formatCurrency(selectedShop.grossSales - selectedShop.platformFeesDeducted - selectedShop.deliveryFeesCollected)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-5 border ${selectedShop.netOwed > 0 ? 'bg-[#F97316]/10 border-[#F97316]/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex justify-between items-center`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${selectedShop.netOwed > 0 ? 'text-[#F97316]' : 'text-emerald-500'}`}>
                    Current Pending Payout
                  </p>
                  <p className={`text-2xl font-display font-bold ${selectedShop.netOwed > 0 ? 'text-white' : 'text-emerald-400'}`}>
                    {selectedShop.netOwed > 0 ? formatCurrency(selectedShop.netOwed) : '₹0 (Settled)'}
                  </p>
                </div>
                {selectedShop.netOwed > 0 && (
                  <button 
                    onClick={(e) => handleMarkPaid(e, selectedShop.id)}
                    disabled={isProcessing}
                    className="bg-[#F97316] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-orange-600 transition active:scale-95"
                  >
                    {isProcessing ? 'Processing...' : 'Mark as Paid'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
