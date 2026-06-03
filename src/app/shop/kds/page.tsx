'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { useAuthStore } from '@/store/authStore'
import { updateOrderStatusDB, cancelOrderAsShop } from '@/lib/supabase/queries/shop-dashboard'
import TicketCard from '@/components/shop/TicketCard'
import toast from 'react-hot-toast'

export default function KDSPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { shopId, orders, setOrders, getNewOrders, getPreparingOrders, getReadyOrders } = useShopOrdersStore()
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!shopId) return
    async function fetchInitial() {
      try {
        const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
        const data = await getShopActiveOrders(shopId!)
        setOrders(data)
      } finally {
        setIsLoading(false)
      }
    }
    if (orders.length === 0) {
      fetchInitial()
    } else {
      setIsLoading(false)
    }
  }, [shopId, orders.length, setOrders])

  // Combine new, preparing, and ready for the kitchen view
  const activeTickets = [...getNewOrders(), ...getPreparingOrders(), ...getReadyOrders()]
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime())

  const handleStatusChange = async (orderId: string, status: string) => {
    if (status === 'preparing') {
      const { stopShopAlarm } = require('@/store/shopOrdersStore')
      stopShopAlarm()
    }
    try {
      await updateOrderStatusDB(orderId, status, user?.id)
      if (status === 'ready') {
        toast.success(`Order #${orderId.substring(0,6)} is Ready!`)
      }
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    const reason = window.prompt("Enter cancellation reason (this will be sent to the student):", "Out of stock")
    if (!reason) return
    
    try {
      await cancelOrderAsShop(orderId, user?.id || '', reason)
      toast.success('Order cancelled and student notified.')
    } catch (err) {
      toast.error('Failed to cancel order')
    }
  }

  return (
    <div className="text-slate-100 flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/shop/dashboard')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-display font-bold">Kitchen Display</h1>
          <div className="flex gap-4 ml-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-sm font-bold text-slate-300">New ({getNewOrders().length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              <span className="text-sm font-bold text-slate-300">Preparing ({getPreparingOrders().length})</span>
            </div>
          </div>
        </div>
        <div className="text-3xl font-mono font-bold tracking-wider text-amber-400">{time}</div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold">Loading kitchen tickets...</p>
          </div>
        ) : activeTickets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <p className="text-6xl mb-4">👨‍🍳</p>
            <p className="text-2xl font-bold">Kitchen is clear. Waiting for orders...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-lg mx-auto w-full pb-32">
            <AnimatePresence mode="popLayout">
              {activeTickets.map(order => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  key={order.id}
                  className="w-full"
                >
                  <TicketCard
                    order={order}
                    onAccept={() => handleStatusChange(order.id, 'preparing')}
                    onReject={() => handleCancelOrder(order.id)}
                    onReady={() => handleStatusChange(order.id, 'ready')}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
