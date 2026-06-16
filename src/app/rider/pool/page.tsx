'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { claimDelivery } from '@/lib/supabase/queries/rider'
import PoolCard from '@/components/rider/PoolCard'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { Bell, BellOff, Sun, Moon } from 'lucide-react'
import { useWakeLock } from '@/lib/useWakeLock'
import { registerPushNotifications } from '@/lib/push-notifications'
import toast from 'react-hot-toast'

export default function RiderPoolPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { availableOrders, activeDeliveries, removeAvailableOrder, addActiveDelivery, isOnline, setIsOnline, batchStartTime, setBatchStartTime, dedicatedShopId } = useRiderStore()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { isSupported: isWakeSupported, isAwake, toggle: toggleWake } = useWakeLock()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Live ticking clock to keep the batch timer updated dynamically
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Check push permission on mount
  useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true)
    }
  })

  const handleEnablePush = async () => {
    if (!user) return
    try {
      const success = await registerPushNotifications(user.id)
      if (success) {
        setPushEnabled(true)
        toast.success('Background notifications enabled!')
      } else {
        toast.error('Push notifications not supported in this browser or Incognito mode.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Error: ' + (err.message || 'Failed to enable notifications'))
    }
  }

  // Smart Batching & Do Not Disturb Logic
  const batchTimeLeftMs = batchStartTime ? Math.max(0, 5 * 60 * 1000 - (now - batchStartTime)) : 0
  const isBatchWindowExpired = batchStartTime ? batchTimeLeftMs === 0 : false
  const isBusy = activeDeliveries.length >= 3 || (activeDeliveries.length > 0 && isBatchWindowExpired)
  
  const formattedTimeLeft = `${Math.floor(batchTimeLeftMs / 60000)}:${String(Math.floor((batchTimeLeftMs % 60000) / 1000)).padStart(2, '0')}`
  const currentShopLockId = activeDeliveries.length > 0 ? activeDeliveries[0].shop_id : null

  // Filter available orders by dedicated shop mode if enabled
  const baseAvailableOrders = dedicatedShopId 
    ? availableOrders.filter(o => o.shop_id === dedicatedShopId) 
    : availableOrders

  // Filter pool: Hide if busy, otherwise if batched lock to shop, else show all
  const displayedOrders = isBusy 
    ? [] 
    : (currentShopLockId ? baseAvailableOrders.filter(o => o.shop_id === currentShopLockId) : baseAvailableOrders)

  const handleClaim = async (orderId: string) => {
    if (!user) return
    const { stopRiderAlarm } = require('@/store/riderStore')
    stopRiderAlarm()

    const orderToClaim = availableOrders.find(o => o.id === orderId)
    
    if (activeDeliveries.length >= 3) {
      toast.error('You can only hold a maximum of 3 active deliveries at a time!')
      return
    }

    if (currentShopLockId && orderToClaim && orderToClaim.shop_id !== currentShopLockId) {
      toast.error('You are currently locked to picking up orders from a single shop. Finish active deliveries first!')
      return
    }

    if (isBusy) {
      toast.error('You are currently on an active delivery! Finish it before accepting new orders.')
      return
    }

    setClaimingId(orderId)
    try {
      await claimDelivery(orderId, user.id)
      
      const claimedOrder = availableOrders.find(o => o.id === orderId)
      if (claimedOrder) {
        removeAvailableOrder(orderId)
        addActiveDelivery({ ...claimedOrder, status: 'out_for_delivery', rider_id: user.id })
      }
      
      if (activeDeliveries.length === 0) {
        setBatchStartTime(Date.now())
        toast.success('Delivery Claimed! You have 5 minutes to batch more orders from this shop. ⏱️')
      } else {
        toast.success(`Delivery Added! Batch size: ${activeDeliveries.length + 1}/3 🛵`)
      }
    } catch (err: any) {
      toast.error('Someone else might have claimed this order already!')
      removeAvailableOrder(orderId) // Remove it from UI just in case
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Delivery Pool</h1>
          <p className="text-gray-500 font-medium text-sm">New orders ready for pickup</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnablePush}
            disabled={pushEnabled}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-gray-100 transition ${pushEnabled ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}
          >
            {pushEnabled ? <Bell size={18} className="text-green-600" /> : <BellOff size={18} className="text-gray-500" />}
          </button>

          {isWakeSupported && (
            <button
              onClick={toggleWake}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-gray-100 transition ${isAwake ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'}`}
            >
              {isAwake ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-gray-500" />}
            </button>
          )}

          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 relative hover:bg-gray-50 transition"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
          
          {/* Realistic Pill Switch Toggle */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out shadow-inner ${
              isOnline ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                isOnline ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        </div>
      </div>

      {/* Smart Batching Warnings */}
      {isOnline && activeDeliveries.length > 0 && !isBusy && (
        <div className="mb-6 p-4 border rounded-2xl text-sm font-medium flex items-start gap-3 bg-blue-100 border-blue-200 text-blue-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-200">
            <motion.div 
              className="h-full bg-blue-500" 
              initial={{ width: '100%' }}
              animate={{ width: `${(batchTimeLeftMs / (5 * 60 * 1000)) * 100}%` }}
              transition={{ ease: 'linear', duration: 1 }}
            />
          </div>
          <span className="text-xl mt-1">⏱️</span>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-blue-900 tracking-tight">BATCH CYCLE ACTIVE</span>
              <span className="font-mono font-bold text-lg bg-blue-200 text-blue-900 px-2 py-0.5 rounded shadow-sm">
                {formattedTimeLeft}
              </span>
            </div>
            <p className="leading-snug">
              You are locked to <b>{activeDeliveries[0].shops?.name || 'this shop'}</b>. 
              You can accept up to <b>{3 - activeDeliveries.length} more order(s)</b> before the timer runs out. 
              <br/><span className="text-blue-600 text-xs font-bold mt-1 inline-block">If no orders appear, view active delivery to proceed!</span>
            </p>
          </div>
        </div>
      )}

      {/* Do Not Disturb Focus Mode */}
      {isOnline && isBusy && (
        <div className="bg-blue-600 rounded-3xl p-8 text-center shadow-xl border border-blue-500 mt-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
          <p className="text-6xl mb-4 relative z-10 animate-bounce">🛵</p>
          <h3 className="font-black text-white text-2xl mb-2 relative z-10 tracking-tight">Do Not Disturb Mode</h3>
          <p className="text-blue-100 text-sm font-medium relative z-10 leading-relaxed mb-6">
            You are currently on an active delivery. Focus on the road and delivering safely! 
            <br className="hidden sm:block"/>
            The pool is hidden and notifications are silenced until you complete this trip.
          </p>
          <button
            onClick={() => router.push(`/rider/delivery/${activeDeliveries[0].id}`)}
            className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl shadow-md active:scale-95 transition relative z-10"
          >
            View Active Delivery
          </button>
        </div>
      )}

      {/* Pool Feed */}
      {!isOnline ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-10">
          <p className="text-5xl mb-4">😴</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">You're Offline</h3>
          <p className="text-gray-500 text-sm">Go online to start receiving delivery requests.</p>
        </div>
      ) : !isBusy && displayedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl text-green-600">📡</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Scanning for orders...</h3>
          <p className="text-gray-500 text-sm mt-1">Wait here, new orders will pop up instantly.</p>
        </div>
      ) : !isBusy ? (
        <div className="space-y-4 relative mt-4">
          <AnimatePresence>
            {displayedOrders.map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", bounce: 0.3 }}
              >
                <PoolCard 
                  order={order} 
                  onClaim={handleClaim} 
                  isClaiming={claimingId === order.id} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
