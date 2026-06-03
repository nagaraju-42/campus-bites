'use client'

import { useState } from 'react'
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
  const { availableOrders, activeDeliveries, removeAvailableOrder, addActiveDelivery, isOnline, setIsOnline } = useRiderStore()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { isSupported: isWakeSupported, isAwake, toggle: toggleWake } = useWakeLock()
  const [pushEnabled, setPushEnabled] = useState(false)

  // Check push permission on mount
  useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true)
    }
  })

  const handleEnablePush = async () => {
    if (!user) return
    const success = await registerPushNotifications(user.id)
    if (success) {
      setPushEnabled(true)
      toast.success('Background notifications enabled!')
    } else {
      toast.error('Failed to enable notifications')
    }
  }

  const currentShopLockId = activeDeliveries.length > 0 ? activeDeliveries[0].shop_id : null

  // Calculate 5-minute batch window
  const firstActiveOrder = activeDeliveries.length > 0 ? activeDeliveries[0] : null
  const firstOrderTime = firstActiveOrder ? new Date(firstActiveOrder.placed_at).getTime() : null
  const isBatchWindowExpired = firstOrderTime ? (Date.now() - firstOrderTime > 5 * 60 * 1000) : false

  // Optimistic Filtering: Hide all other shops if locked
  const displayedOrders = currentShopLockId 
    ? availableOrders.filter(o => o.shop_id === currentShopLockId)
    : availableOrders

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

    if (currentShopLockId && isBatchWindowExpired) {
      toast.error('Your 5-minute batching window has expired! Please deliver your current orders so they don\'t get cold.')
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
      
      toast.success('Delivery Claimed! Build your batch or start delivering. 🛵')
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
      {isOnline && activeDeliveries.length >= 3 && (
        <div className="mb-6 p-4 bg-orange-100 border border-orange-200 rounded-2xl text-orange-800 text-sm font-medium flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <p>You have reached the maximum batch size of 3 active deliveries. Please deliver an order before accepting more.</p>
        </div>
      )}
      {isOnline && activeDeliveries.length > 0 && activeDeliveries.length < 3 && (
        <div className={`mb-6 p-4 border rounded-2xl text-sm font-medium flex items-start gap-3 ${isBatchWindowExpired ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
          <span className="text-xl">{isBatchWindowExpired ? '⏳' : '🔒'}</span>
          <p>
            {isBatchWindowExpired 
              ? "Your 5-minute batching window has expired! Proceed to delivery to keep the food hot."
              : `Smart Batching: You are locked to ${activeDeliveries[0].shops?.name || 'this shop'}. You have 5 minutes to batch more orders.`}
          </p>
        </div>
      )}

      {/* Pool Feed */}
      {!isOnline ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-10">
          <p className="text-5xl mb-4">😴</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">You're Offline</h3>
          <p className="text-gray-500 text-sm">Go online to start receiving delivery requests.</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl text-green-600">📡</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Scanning for orders...</h3>
          <p className="text-gray-500 text-sm mt-1">Wait here, new orders will pop up instantly.</p>
        </div>
      ) : (
        <div className="space-y-4 relative">
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
      )}
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
