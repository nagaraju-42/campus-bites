'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Bell, BellOff, Sun, Moon, AlertCircle } from 'lucide-react'
import { useWakeLock } from '@/lib/useWakeLock'
import { registerPushNotifications } from '@/lib/push-notifications'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { useAuthStore } from '@/store/authStore'
import { updateOrderStatusDB, cancelOrderAsShop } from '@/lib/supabase/queries/shop-dashboard'
import TicketCard from '@/components/shop/TicketCard'
import toast from 'react-hot-toast'

export default function KDSPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { shopId, orders, setOrders, getNewOrders, getPreparingOrders, getReadyOrders } = useShopOrdersStore()
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }))
  const [isLoading, setIsLoading] = useState(true)
  const { isSupported: isWakeSupported, isAwake, toggle: toggleWake } = useWakeLock()
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    // Check if push is already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true)
    }
  }, [])

  const handleEnablePush = async () => {
    if (!user) return
    try {
      const success = await registerPushNotifications(user.id)
      if (success) {
        setPushEnabled(true)
        toast.success('Background notifications enabled!')
      }
    } catch (err: any) {
      toast.error(`Push Error: ${err.message}`, { duration: 6000 })
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })), 1000)
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
    .sort((a, b) => {
      // Prioritize dine-in
      const aIsDineIn = a.order_type === 'dine_in' || a.hostel_name?.includes('[Dine-In]')
      const bIsDineIn = b.order_type === 'dine_in' || b.hostel_name?.includes('[Dine-In]')
      if (aIsDineIn && !bIsDineIn) return -1
      if (!aIsDineIn && bIsDineIn) return 1
      return new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime()
    })

  const preparingDeliveryCount = getPreparingOrders().filter(o => o.order_type !== 'dine_in' && !o.hostel_name?.includes('[Dine-In]')).length
  const isHighLoad = preparingDeliveryCount > 6

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

  const handleCancelOrder = async (orderId: string, reason: string) => {
    if (!reason) return
    
    try {
      await cancelOrderAsShop(orderId, user?.id || '', reason)
      const { updateOrderStatus } = useShopOrdersStore.getState()
      updateOrderStatus(orderId, 'cancelled')
      toast.success('Order cancelled and student notified.')
    } catch (err) {
      toast.error('Failed to cancel order')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 md:p-4">
      {/* Mobile Constraint Container */}
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-slate-900 md:border-[8px] border-slate-800 md:rounded-[3rem] flex flex-col overflow-hidden relative shadow-2xl mx-auto ring-1 ring-white/10 text-slate-100">
        
        {/* Header */}
        <div className="flex flex-col gap-4 p-5 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
          <div className="flex justify-between items-center">
            <button onClick={() => router.push('/shop/dashboard')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
              <ArrowLeft size={20} />
            </button>
            <div className="text-2xl font-mono font-bold tracking-wider text-amber-400">{time}</div>
          </div>
          
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold">Kitchen Display</h1>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                <span className="text-xs font-bold text-slate-300">New ({getNewOrders().length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span className="text-xs font-bold text-slate-300">Prep ({getPreparingOrders().length})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleEnablePush}
              disabled={pushEnabled}
              className={`flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${pushEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'}`}
            >
              {pushEnabled ? <><Bell size={14} /> Push On</> : <><BellOff size={14} /> Enable Push</>}
            </button>
            {isWakeSupported && (
              <button
                onClick={toggleWake}
                className={`flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${isAwake ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'}`}
              >
                {isAwake ? <><Sun size={14} /> Awake</> : <><Moon size={14} /> Sleep</>}
              </button>
            )}
          </div>
        </div>

      
      {/* Grid */}
      <div className="flex-1 overflow-auto bg-slate-900/50 p-4">
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
            {isHighLoad && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 font-bold text-center flex items-center justify-center gap-2 animate-pulse">
                <AlertCircle size={20} />
                HIGH LOAD DETECTED: {preparingDeliveryCount} active delivery tickets. New orders will automatically have +10 mins ETA.
              </div>
            )}
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
                    currentShopId={shopId || ''}
                    onAccept={() => handleStatusChange(order.id, 'preparing')}
                    onReject={(reason) => handleCancelOrder(order.id, reason)}
                    onReady={() => handleStatusChange(order.id, 'ready')}
                    onDelivered={() => handleStatusChange(order.id, 'delivered')}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
