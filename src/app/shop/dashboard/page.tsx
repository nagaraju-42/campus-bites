'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, ShoppingBag, Users, AlertCircle, Bell, Send, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner, updateShopStatusDB, getShopActiveOrders, getShopCompletedOrders, getShopStats } from '@/lib/supabase/queries/shop-dashboard'
import StatCard from '@/components/shop/StatCard'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Order } from '@/types'
import toast from 'react-hot-toast'
import { broadcastNotification } from '@/lib/supabase/queries/notifications'

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'all_time'

// Dynamic chart data will be calculated from real orders

export default function ShopDashboardPage() {
  const { user } = useAuthStore()
  const { shopId, isLive, setLiveStatus, setOrders } = useShopOrdersStore()
  const [shopName, setShopName] = useState('')
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  
  // Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgValue: 0, cancelled: 0 })
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  useEffect(() => {
    if (!user || !shopId) return
    async function loadData() {
      try {
        const shop = await getShopDetailsByOwner(user!.id)
        if (!shop) {
          toast.error("Shop profile not found. Please create one.")
          return
        }

        const [activeOrders, completed] = await Promise.all([
          getShopActiveOrders(shopId!),
          getShopCompletedOrders(shopId!)
        ])
        const shopStats = await getShopStats(shopId!, timeRange)
        
        setShopName(shop.name)
        setLiveStatus(shop.is_open)
        setOrders(activeOrders)
        setRecentOrders(completed)
        setStats(shopStats)

      } catch (err) {
        console.error("Failed to load shop dashboard data:", err)
      }
    }
    loadData()
  }, [user, shopId])

  useEffect(() => {
    if (!shopId) return
    async function loadStats() {
      setIsStatsLoading(true)
      try {
        const shopStats = await getShopStats(shopId!, timeRange)
        setStats(shopStats)
      } catch (err) {
        console.error(err)
      } finally {
        setIsStatsLoading(false)
      }
    }
    loadStats()
  }, [timeRange, shopId])

  const [isToggling, setIsToggling] = useState(false)

  const toggleStatus = async () => {
    if (!shopId || isToggling) return
    setIsToggling(true)
    const newStatus = !isLive
    try {
      await updateShopStatusDB(shopId, newStatus)
      setLiveStatus(newStatus)
      toast.success(`Shop is now ${newStatus ? 'OPEN' : 'CLOSED'}`)
    } catch (err) {
      toast.error('Failed to update shop status')
    } finally {
      setIsToggling(false)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || !shopId) return
    setIsBroadcasting(true)
    try {
      await broadcastNotification(shopId, shopName, broadcastMessage.trim())
      toast.success('Broadcast sent to all students! 🚀')
      setBroadcastMessage('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send broadcast')
    } finally {
      setIsBroadcasting(false)
    }
  }

  const broadcastPresets = [
    "🔥 Fresh snacks are ready! Order now.",
    "🕛 We are open for Midnight Cravings!",
    "🎉 Get 20% off all rolls for the next hour!",
    "🥤 Cold drinks restocked."
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 font-medium text-sm">Welcome back, {shopName}</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 relative hover:bg-gray-50 transition"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-bold text-sm text-gray-700">{isLive ? 'Accepting Orders' : 'Closed'}</span>
            <button 
              onClick={toggleStatus}
              disabled={isToggling}
              className={`ml-2 px-3 py-1 text-xs font-bold rounded-lg transition ${
                isToggling ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500' :
                isLive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {isToggling ? 'Updating...' : isLive ? 'Close Shop' : 'Open Shop'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900">Performance Summary</h2>
          <div className="relative">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-xl font-bold text-sm shadow-sm focus:outline-none focus:border-blue-500"
            >
              <option value="today">Today (Live)</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all_time">All Time</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${isStatsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <StatCard title="Total Revenue" value={formatCurrency(stats.revenue)} icon={<IndianRupee size={24} />} />
          <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingBag size={24} />} />
          <StatCard title="Avg Order Value" value={formatCurrency(stats.avgValue)} icon={<Users size={24} />} />
          <StatCard title="Cancelled" value={stats.cancelled} icon={<AlertCircle size={24} />} />
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
          <h2 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
            <span>Recent Completed Orders</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">Live Today</span>
          </h2>
          <div className="space-y-4 overflow-y-auto flex-1 max-h-[400px] pr-2">
            {recentOrders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No completed orders today.</p>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{order.order_number}</p>
                    <p className="text-xs font-medium text-gray-400">{formatDate(order.placed_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs font-bold text-green-600">Delivered</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Broadcast Notification Widget */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              📢 Broadcast Message
            </h2>
            <p className="text-gray-500 text-xs font-medium mb-4">Send an instant alert to all students on the platform.</p>
            
            <textarea 
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="e.g. Fresh Samosas are ready! Grab them before they are gone."
              className="w-full border border-gray-200 rounded-xl p-3 h-24 mb-3 focus:outline-none focus:border-blue-500 resize-none text-sm font-medium"
            />

            <div className="flex flex-wrap gap-2 mb-4">
              {broadcastPresets.map((preset, idx) => (
                <button 
                  key={idx}
                  onClick={() => setBroadcastMessage(preset)}
                  className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-bold px-2 py-1 rounded-md hover:bg-gray-100 transition text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleBroadcast}
            disabled={isBroadcasting || !broadcastMessage.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={16} /> {isBroadcasting ? 'Broadcasting...' : 'Send to All Students'}
          </button>
        </div>



      </div>
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
