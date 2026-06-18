'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, ShoppingBag, Users, AlertCircle, Bell, Send, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner, updateShopStatusDB, getShopActiveOrders, getShopOrderHistory, getShopStats, toggleBusyModeDB } from '@/lib/supabase/queries/shop-dashboard'
import StatCard from '@/components/shop/StatCard'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Order } from '@/types'
import toast from 'react-hot-toast'
import { broadcastNotification } from '@/lib/supabase/queries/notifications'
import { createClient } from '@/lib/supabase/client'
import WhatsAppQRShare from '@/components/shop/WhatsAppQRShare'
import FinancialsWidget from '@/components/shop/FinancialsWidget'

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'all_time'

// Dynamic chart data will be calculated from real orders

export default function ShopDashboardPage() {
  const { user } = useAuthStore()
  const { shopId, isLive, setLiveStatus, setOrders } = useShopOrdersStore()
  const [shopName, setShopName] = useState('')
  const [isBusyMode, setIsBusyMode] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  
  // Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgValue: 0, cancelled: 0 })
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [ridersList, setRidersList] = useState<any[]>([])
  const [pendingHandoffs, setPendingHandoffs] = useState<any[]>([])

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
          getShopOrderHistory(shopId!, 5)
        ])
        
        const { data: riders, error: ridersErr } = await createClient()
          .from('profiles')
          .select('id, full_name, phone')
          .eq('role', 'rider')
          
        if (ridersErr) console.error("Riders fetch error:", ridersErr)

        const shopStats = await getShopStats(shopId!, timeRange)

        // Fetch pending handoffs
        const todayDateStr = new Date().toISOString().slice(0, 10)
        const { data: handoffs, error: handoffsErr } = await createClient()
          .from('rider_settlements')
          .select('*, rider:rider_id(full_name)')
          .eq('shop_id', shopId!)
          .eq('date', todayDateStr)
          .eq('status', 'pending')
          
        if (handoffsErr) console.error("Handoffs fetch error:", handoffsErr)
        
        setShopName(shop.name)
        setLiveStatus(shop.is_open)
        setIsBusyMode(shop.busy_mode || false)
        setOrders(activeOrders)
        setRecentOrders(completed)
        setStats(shopStats)
        if (riders) setRidersList(riders)
        if (handoffs) setPendingHandoffs(handoffs)

      } catch (err) {
        console.error("Failed to load shop dashboard data:", err)
        toast.error("Failed to load dashboard data. Check console.")
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

  const [isTogglingBusy, setIsTogglingBusy] = useState(false)

  const handleToggleBusyMode = async () => {
    if (!shopId || !user || isTogglingBusy) return
    setIsTogglingBusy(true)
    const newBusyStatus = !isBusyMode
    try {
      await toggleBusyModeDB(shopId, newBusyStatus, user.id)
      setIsBusyMode(newBusyStatus)
      toast.success(newBusyStatus ? 'Busy Mode ON (+10 mins ETA)' : 'Busy Mode OFF')
    } catch (err: any) {
      toast.error('Failed to toggle Busy Mode')
    } finally {
      setIsTogglingBusy(false)
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

        <div className="flex flex-wrap items-center gap-3">
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
          
          <button 
            onClick={handleToggleBusyMode}
            disabled={isTogglingBusy}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm border ${
              isTogglingBusy ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-200' :
              isBusyMode ? 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
            }`}
            title="Adds +10 minutes to all new delivery ETAs"
          >
            {isTogglingBusy ? 'Updating...' : isBusyMode ? '🔥 Busy Mode ON' : 'Busy Mode OFF'}
          </button>
        </div>
      </div>

      {/* Pending Handoffs Alert */}
      {pendingHandoffs.length > 0 && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900">Action Required: Pending Cash Handoffs</h3>
              <p className="text-sm text-amber-800 mt-1">
                You have {pendingHandoffs.length} rider{pendingHandoffs.length > 1 ? 's' : ''} waiting for you to collect and approve cash handoffs. 
                <a href="/shop/reports" className="ml-2 font-bold underline hover:text-amber-600">Go to Reports to Approve &rarr;</a>
              </p>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
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

        {/* Financials Widget */}
        <div className="h-full">
          {shopId && <FinancialsWidget shopId={shopId} />}
        </div>

        {/* Broadcast & Actions Stack */}
        <div className="space-y-6">
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

          {/* WhatsApp Share Widget */}
          <div>
            {shopId && <WhatsAppQRShare shopId={shopId} />}
          </div>
        </div>

      </div>

      {/* Rider Contacts Directory */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-[#2563EB]" />
          Rider Directory
        </h2>
        {ridersList.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No riders found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ridersList.map(rider => (
              <div key={rider.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div>
                  <p className="font-bold text-sm text-gray-900">{rider.full_name}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{rider.phone || 'No phone'}</p>
                </div>
                {rider.phone && (
                  <a 
                    href={`tel:${rider.phone}`}
                    className="w-10 h-10 bg-blue-100 text-[#2563EB] hover:bg-blue-600 hover:text-white rounded-full flex items-center justify-center transition active:scale-95"
                    title={`Call ${rider.full_name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
