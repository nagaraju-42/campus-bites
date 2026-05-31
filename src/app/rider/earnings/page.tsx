'use client'

import { useEffect, useState } from 'react'
import { Wallet, IndianRupee, TrendingUp, Calendar, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getRiderEarnings } from '@/lib/supabase/queries/rider'
import { formatCurrency } from '@/lib/utils'

export default function RiderEarningsPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ deliveriesCompleted: 0, totalEarned: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const data = await getRiderEarnings(user!.id)
        setStats(data)
      } catch (err) {
        console.error("Failed to load earnings", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  if (isLoading) {
    return <div className="p-10 text-center font-bold text-green-700">Loading wallet...</div>
  }

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">My Earnings</h1>
        <p className="text-gray-500 font-medium text-sm">Track your daily progress</p>
      </div>

      {/* Main Stat Card */}
      <div className="bg-[#16A34A] rounded-3xl p-6 text-white shadow-lg shadow-green-200 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Wallet size={160} />
        </div>
        
        <p className="font-bold text-green-100 text-sm uppercase tracking-wider mb-2">Today's Earnings</p>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-display font-bold">{formatCurrency(stats.totalEarned)}</span>
        </div>
        
        <div className="mt-8 pt-4 border-t border-green-500/30 flex justify-between items-center">
          <div>
            <p className="text-green-100 text-xs font-bold uppercase">Deliveries</p>
            <p className="text-xl font-bold">{stats.deliveriesCompleted}</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-xs font-bold uppercase">Time Online</p>
            <p className="text-xl font-bold">4h 12m</p>
          </div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0">
          <TrendingUp size={24} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <p className="font-bold text-gray-900 text-sm">Weekly Goal</p>
            <p className="text-xs font-bold text-gray-500">₹{stats.totalEarned} / ₹2000</p>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full" 
              style={{ width: `${Math.min((stats.totalEarned / 2000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* History Placeholder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Recent Transactions</h3>
          <button className="text-[#16A34A] text-xs font-bold flex items-center">
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map((_, idx) => (
            <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#16A34A]">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Delivery Fee</p>
                  <p className="text-xs text-gray-400 font-medium">Order #{Math.floor(Math.random() * 90000) + 10000}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#16A34A]">+₹15</p>
                <p className="text-xs text-gray-400">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
