'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getStudentOrders } from '@/lib/supabase/queries/orders'
import { useAuthStore } from '@/store/authStore'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

const TABS = ['All', 'Ongoing', 'Completed', 'Cancelled']

export default function MyOrdersPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState('All')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const data = await getStudentOrders(user!.id)
      setOrders(data)
      setIsLoading(false)
    }
    load()
  }, [user])

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Ongoing') return !['delivered', 'cancelled'].includes(o.status)
    if (activeTab === 'Completed') return o.status === 'delivered'
    if (activeTab === 'Cancelled') return o.status === 'cancelled'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-[430px] mx-auto border-x border-gray-100">
      {/* Header (White) */}
      <div className="bg-white px-5 pt-12 pb-0">
        <div className="flex items-center gap-3 text-gray-900 mb-6">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-display font-bold flex-1">My Orders</h1>
        </div>
        {/* Tabs */}
        <div className="flex justify-between border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 font-medium text-sm">No orders yet in this category</p>
          </div>
        ) : (
          <motion.div className="space-y-4">
            {filteredOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => router.push(`/student/track/${order.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-98 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{order.order_number}</p>
                    <p className="text-gray-500 text-xs font-medium">{order.shops?.name}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    order.status === 'pending' ? 'text-gray-600 bg-gray-100' :
                    order.status === 'preparing' ? 'text-orange-600 bg-orange-100' :
                    order.status === 'ready' ? 'text-green-600 bg-green-100' :
                    order.status === 'assigned' ? 'text-blue-600 bg-blue-100' :
                    order.status === 'out_for_delivery' ? 'text-purple-600 bg-purple-100' :
                    order.status === 'delivered' ? 'text-[#16A34A] bg-green-50' :
                    order.status === 'cancelled' ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="border-t border-dashed border-gray-100 pt-3 flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-xs font-medium">{formatDate(order.placed_at)}</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
