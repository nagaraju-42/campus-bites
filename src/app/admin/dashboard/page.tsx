'use client'

import { useEffect, useState } from 'react'
import { IndianRupee, Users, Store, Activity, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getPlatformMetrics } from '@/lib/supabase/queries/admin'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import { formatCurrency } from '@/lib/utils'
import { PlatformMetrics } from '@/types'


export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getPlatformMetrics()
        setMetrics(data)
      } catch (err) {
        console.error("Failed to load metrics", err)
      }
    }
    load()
  }, [])

  if (!metrics) {
    return <div className="p-10 text-slate-400">Loading system metrics...</div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Platform Overview</h1>
          <p className="text-slate-400 mt-1">Live metrics for DineNDeliver</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E293B] text-slate-300 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-800 transition">
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminMetricCard 
          title="Gross Volume (Today)" 
          value={formatCurrency(metrics.totalRevenue)} 
          icon={<IndianRupee size={24} />} 
          trend="18.2%" trendUp 
        />
        <AdminMetricCard 
          title="Platform Fees (Today)" 
          value={formatCurrency(metrics.platformFeesEarned)} 
          icon={<Activity size={24} />} 
          trend="18.2%" trendUp 
        />
        <AdminMetricCard 
          title="Completed Deliveries" 
          value={metrics.totalDeliveriesToday} 
          icon={<Users size={24} />} 
        />
        <AdminMetricCard 
          title="Active Shops" 
          value={metrics.activeShops} 
          icon={<Store size={24} />} 
        />
      </div>

      {/* Chart Section */}
      <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg mt-8">
        <h2 className="text-lg font-bold text-white mb-6">7-Day Revenue Trend</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" stroke="#64748B" tick={{fill: '#64748B'}} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="#64748B" tick={{fill: '#64748B'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#F97316', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
