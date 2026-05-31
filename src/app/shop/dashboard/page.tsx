'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, ShoppingBag, Users, AlertCircle, Download, FileText } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner, updateShopStatusDB, getShopActiveOrders, getShopCompletedOrders } from '@/lib/supabase/queries/shop-dashboard'
import StatCard from '@/components/shop/StatCard'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Bell } from 'lucide-react'
import { Order } from '@/types'
import toast from 'react-hot-toast'

// Mock chart data for now
const chartData = [
  { time: '10 AM', revenue: 400 },
  { time: '12 PM', revenue: 1200 },
  { time: '2 PM', revenue: 800 },
  { time: '4 PM', revenue: 1500 },
  { time: '6 PM', revenue: 2000 },
]

export default function ShopDashboardPage() {
  const { user } = useAuthStore()
  const { shopId, isLive, setLiveStatus, setOrders } = useShopOrdersStore()
  const [shopName, setShopName] = useState('')
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgValue: 0 })

  useEffect(() => {
    if (!user || !shopId) return
    async function loadData() {
      const [shop, activeOrders, completed] = await Promise.all([
        getShopDetailsByOwner(user!.id),
        getShopActiveOrders(shopId!),
        getShopCompletedOrders(shopId!)
      ])
      
      setShopName(shop.name)
      setLiveStatus(shop.is_open)
      setOrders(activeOrders)
      setRecentOrders(completed)

      const totalRevenue = completed.reduce((sum, o) => sum + o.total_amount, 0)
      setStats({
        revenue: totalRevenue,
        orders: completed.length,
        avgValue: completed.length > 0 ? totalRevenue / completed.length : 0
      })
    }
    loadData()
  }, [user, shopId, setLiveStatus, setOrders])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(stats.revenue)} icon={<IndianRupee size={24} />} trend="12.5%" trendUp />
        <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingBag size={24} />} trend="8.2%" trendUp />
        <StatCard title="Avg Order Value" value={formatCurrency(stats.avgValue)} icon={<Users size={24} />} />
        <StatCard title="Cancelled" value="0" icon={<AlertCircle size={24} />} />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-gray-900">Revenue Overview</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 text-xs font-bold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                <Download size={14} /> CSV
              </button>
              <button className="flex items-center gap-1 text-xs font-bold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6">Recent Completed Orders</h2>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-gray-400 text-sm">No completed orders today.</p>
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

      </div>
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
