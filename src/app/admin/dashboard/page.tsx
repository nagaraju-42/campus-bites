'use client'

import { useEffect, useState } from 'react'
import { IndianRupee, Users, Store, Activity, Download, Smartphone, Wifi, WifiOff } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getPlatformMetrics, getLateOrders } from '@/lib/supabase/queries/admin'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PlatformMetrics } from '@/types'
import OnlineUsersCounter from '@/components/shop/OnlineUsersCounter'
import { createClient } from '@/lib/supabase/client'
import { Clock, PhoneCall } from 'lucide-react'


export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [apkDevices, setApkDevices] = useState<any[]>([])
  const [lateOrders, setLateOrders] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [data, lateData] = await Promise.all([
          getPlatformMetrics(),
          getLateOrders()
        ])
        setMetrics(data)
        setLateOrders(lateData)
      } catch (err) {
        console.error("Failed to load metrics", err)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadDevices() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('apk_devices')
          .select('*')
          .order('last_seen_at', { ascending: false })
        if (data) setApkDevices(data)
      } catch (err) {
        console.error("Failed to load APK devices", err)
      }
    }
    loadDevices()
  }, [])

  const handleNudgeShop = async (order: any) => {
    if (!order.shops?.owner_id) {
      alert('Cannot nudge: Unknown shop owner');
      return;
    }
    try {
      await fetch('/api/fcm/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.shops.owner_id,
          title: `⚠️ Late Order Alert!`,
          message: `Order #${order.order_number} is late by ${Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 60000)} mins. Please process it ASAP.`,
          data: { orderId: order.id }
        })
      });
      alert('Nudge sent successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send nudge');
    }
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <OnlineUsersCounter theme="dark" />
          <button className="flex items-center gap-2 bg-[#1E293B] text-slate-300 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-800 transition">
            <Download size={16} /> Export Report
          </button>
        </div>
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

      {/* 🚨 Late Orders (20+ mins) */}
      <div className="bg-[#1E293B] p-6 rounded-2xl border border-red-500/30 shadow-lg mt-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-red-400" />
            Late Orders Alert (&gt;20 mins)
          </h2>
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">{lateOrders.length} Late</span>
        </div>
        
        {lateOrders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">All orders are on time! 🎉</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lateOrders.map(order => {
              const shopPhone = order.shops?.profiles?.phone;
              return (
                <div key={order.id} className="bg-slate-800 p-4 rounded-xl border border-red-900/50 flex flex-col gap-3 justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white">Order #{order.order_number}</span>
                      <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded font-medium border border-red-800">
                        {Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 60000)} mins ago
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{order.shops?.name || 'Unknown Shop'}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {shopPhone ? (
                      <a href={`tel:${shopPhone}`} className="flex-1 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 text-green-400 text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition">
                        <PhoneCall size={16} /> Call Shop
                      </a>
                    ) : (
                      <div className="flex-1 bg-slate-700/50 text-slate-500 text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center border border-slate-600/50">
                        No Phone
                      </div>
                    )}
                    <button 
                      onClick={() => handleNudgeShop(order)}
                      className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/50 text-orange-400 text-sm font-bold py-2 px-4 rounded-lg transition"
                    >
                      Nudge
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 📱 APK Devices Section */}
      <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone size={20} className="text-blue-400" />
            APK Devices Registered
          </h2>
          <span className="text-slate-400 text-sm">{apkDevices.length} device{apkDevices.length !== 1 ? 's' : ''}</span>
        </div>
        {apkDevices.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No APK devices registered yet. Devices appear here when a Shop Owner installs and opens the APK for the first time.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-bold pb-3 pr-4">Status</th>
                  <th className="text-left text-slate-400 font-bold pb-3 pr-4">Device Name</th>
                  <th className="text-left text-slate-400 font-bold pb-3 pr-4">Shop</th>
                  <th className="text-left text-slate-400 font-bold pb-3">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {apkDevices.map((device) => {
                  const lastSeen = new Date(device.last_seen_at)
                  const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60000)
                  const isOnline = minutesAgo < 10
                  return (
                    <tr key={device.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                      <td className="py-3 pr-4">
                        {isOnline ? (
                          <span className="flex items-center gap-1.5 text-green-400 font-bold text-xs">
                            <Wifi size={14} /> Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                            <WifiOff size={14} /> Offline
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-white font-bold">{device.device_name}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-slate-300">{device.shop_name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-slate-400">
                          {minutesAgo < 1 ? 'Just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : lastSeen.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
