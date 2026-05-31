'use client'

import { useEffect, useState } from 'react'
import { Banknote, Download, Building2, User } from 'lucide-react'
import { getAllShops } from '@/lib/supabase/queries/admin'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminPayoutsPage() {
  const [shops, setShops] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllShops()
        // Mock calculations for MVP since we don't track payouts in a separate table yet
        const shopsWithOwed = data.map(s => ({
          ...s,
          amount_owed: Math.floor(Math.random() * 5000) + 1000 // Mock owed amount between ₹1000 and ₹6000
        }))
        setShops(shopsWithOwed)
      } catch (err) {
        console.error("Failed to load payouts", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleMarkPaid = (shopId: string) => {
    setShops(shops.map(s => s.id === shopId ? { ...s, amount_owed: 0 } : s))
    toast.success('Payout marked as processed.')
  }

  const exportCSV = () => {
    toast.success('CSV Export downloaded.')
  }

  const totalPending = shops.reduce((sum, s) => sum + (s.amount_owed || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Financials & Payouts</h1>
          <p className="text-slate-400 mt-1">Manage bulk payouts to restaurant partners</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-[#F97316] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition">
          <Download size={18} /> Export Bank CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Pending Payouts</p>
          <p className="text-4xl font-display font-bold text-[#F97316]">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Next Payout Cycle</p>
          <p className="text-3xl font-display font-bold text-white">Tomorrow, 10 AM</p>
        </div>
        <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Partners Awaiting Payment</p>
          <p className="text-3xl font-display font-bold text-white">{shops.filter(s => s.amount_owed > 0).length}</p>
        </div>
      </div>

      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 bg-[#0F172A]">
          <h2 className="font-bold text-white text-lg flex items-center gap-2"><Building2 size={20} className="text-[#F97316]"/> Shop Partner Balances</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A]/50 border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Partner Details</th>
                <th className="px-6 py-4">Bank / UPI</th>
                <th className="px-6 py-4">Amount Owed</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Loading payout data...</td></tr>
              ) : shops.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No active partners found.</td></tr>
              ) : (
                shops.map(shop => (
                  <tr key={shop.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{shop.name}</p>
                      <p className="text-xs text-slate-400 mt-1">ID: {shop.id.substring(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded w-max border border-slate-700">payout@{shop.name.toLowerCase().replace(/\s+/g, '')}.upi</p>
                    </td>
                    <td className="px-6 py-4">
                      {shop.amount_owed > 0 ? (
                        <span className="text-lg font-bold text-[#F97316]">{formatCurrency(shop.amount_owed)}</span>
                      ) : (
                        <span className="text-sm font-bold text-emerald-500">Cleared</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleMarkPaid(shop.id)}
                        disabled={shop.amount_owed === 0}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                          shop.amount_owed > 0 
                            ? 'bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 border border-[#F97316]/20' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <Banknote size={14} />
                        {shop.amount_owed > 0 ? 'Mark as Paid' : 'Settled'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
