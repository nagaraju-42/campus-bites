'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, Sun, Moon } from 'lucide-react'
import { useWakeLock } from '@/lib/useWakeLock'
import { registerPushNotifications } from '@/lib/push-notifications'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { claimDelivery } from '@/lib/supabase/queries/rider'

export default function Rider2DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { activeDeliveries, availableOrders, removeAvailableOrder, addActiveDelivery, isOnline, setIsOnline } = useRiderStore()
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([])
  const { isSupported: isWakeSupported, isAwake, toggle: toggleWake } = useWakeLock()
  const [pushEnabled, setPushEnabled] = useState(false)

  // Fetch delivered today
  useEffect(() => {
    if (!user) return
    async function fetchDelivered() {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', user!.id)
        .eq('status', 'delivered')
        .gte('placed_at', today.toISOString())
        .order('placed_at', { ascending: false })
      
      if (data) setDeliveredOrders(data)
    }
    fetchDelivered()
  }, [user])

  // Check push permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true)
    }
  }, [])

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

  const handleClaimOrder = async (orderId: string) => {
    if (!user) return
    try {
      await claimDelivery(orderId, user.id)

      const claimedOrder = availableOrders.find(o => o.id === orderId)
      if (claimedOrder) {
        removeAvailableOrder(orderId)
        addActiveDelivery({ ...claimedOrder, status: 'out_for_delivery', rider_id: user.id })
        toast.success('Order claimed! Proceed to pickup.')
      }
    } catch (err: any) {
      toast.error('Order might have been claimed by someone else.')
    }
  }

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 font-medium text-sm">Your assigned deliveries</p>
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
          
          {/* Realistic Pill Switch Toggle */}
          <div className="flex items-center gap-3 ml-2">
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

      {!isOnline ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-10">
          <p className="text-5xl mb-4">😴</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">You're Offline</h3>
          <p className="text-gray-500 text-sm">Go online to start receiving delivery requests.</p>
        </div>
      ) : (
        <>
          <h2 className="font-bold text-gray-900 mb-4 mt-8">Available for Pickup ({availableOrders.length})</h2>
          
          {availableOrders.length > 0 && (
            <div className="space-y-4 mb-8">
              {availableOrders.map(order => (
                <div key={order.id} className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase mb-2 inline-block">
                        Ready
                      </span>
                      <h3 className="font-bold text-gray-900">Order #{order.order_number}</h3>
                      <p className="text-xs text-gray-600 font-medium mt-1">Shop: {order.shops?.name}</p>
                      {order.order_items?.some((i: any) => i.partner_shop_id) && (
                        <p className="text-xs text-[#F97316] font-bold mt-0.5">
                          + Pickup from: {order.order_items.find((i: any) => i.partner_shop_id)?.partner?.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Deliver to: {order.hostel_name}</p>
                    </div>
                    <span className="text-lg font-bold text-orange-600">₹{order.total_amount}</span>
                  </div>
                  <button 
                    onClick={() => handleClaimOrder(order.id)}
                    className="w-full bg-[#F97316] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-orange-600 active:scale-95 transition"
                  >
                    Claim Order
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-bold text-gray-900 mb-4 mt-8">Active Orders ({activeDeliveries.length})</h2>
          
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-3xl text-gray-400 mb-2 block">🛵</span>
              <h3 className="font-bold text-gray-900">No active deliveries</h3>
              <p className="text-gray-500 text-sm mt-1">Wait for the shop to assign you orders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase mb-2 inline-block">
                      {order.status === 'ready' ? 'Ready for Pickup' : 'Out for Delivery'}
                    </span>
                    <h3 className="font-bold text-gray-900">Order #{order.order_number}</h3>
                    {order.order_items?.some((i: any) => i.partner_shop_id) && (
                      <p className="text-xs text-[#16A34A] font-bold mt-0.5">
                        + {order.order_items.find((i: any) => i.partner_shop_id)?.partner?.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate max-w-[200px] mt-1">{order.hostel_name}</p>
                  </div>
                  <Link href={`/rider2/delivery/${order.id}`} className="bg-[#16A34A] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-bold text-gray-900 mb-4 mt-8">Delivered Today ({deliveredOrders.length})</h2>
          
          {deliveredOrders.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No deliveries completed today yet.</p>
          ) : (
            <div className="space-y-3">
              {deliveredOrders.map(order => (
                <div key={order.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-600 text-sm">Order #{order.order_number}</h3>
                    <p className="text-xs text-gray-400 mt-1">{new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Delivered</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
