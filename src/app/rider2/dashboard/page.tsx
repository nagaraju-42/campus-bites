'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, Sun, Moon, Check } from 'lucide-react'
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
  
  // Interactive KDS Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [showCollectionPrompt, setShowCollectionPrompt] = useState(false)

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({...prev, [id]: !prev[id]}))
  }

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

  const handleClaimBatch = async (shopId: string) => {
    if (!user) return

    if (activeDeliveries.length > 0 && activeDeliveries[0].shop_id !== shopId) {
      toast.error('You are locked to your current batch shop! Deliver your active orders first.')
      return
    }
    
    const batchOrders = availableOrders.filter(o => o.shop_id === shopId)
    if (batchOrders.length === 0) return

    try {
      // Claim all orders in the batch
      for (const order of batchOrders) {
        await claimDelivery(order.id, user.id)
      }

      // Update local state
      for (const order of batchOrders) {
        removeAvailableOrder(order.id)
        addActiveDelivery({ ...order, status: 'out_for_delivery', rider_id: user.id })
      }
      toast.success(`Claimed batch of ${batchOrders.length} orders! Proceed to pickup.`)
    } catch (err: any) {
      toast.error('Failed to claim batch. Someone else might have claimed it.')
    }
  }

  // Calculate grouped batches
  const groupedBatches = availableOrders.reduce((acc, order) => {
    if (!acc[order.shop_id]) acc[order.shop_id] = { shopName: order.shops?.name || 'Unknown Shop', orders: [] }
    acc[order.shop_id].orders.push(order)
    return acc
  }, {} as Record<string, { shopName: string, orders: any[] }>)

  // Check if active deliveries have an active countdown timer (5 mins from claiming)
  // We'll use the oldest 'out_for_delivery' order to track the batch claim time loosely,
  // or just look at the current time vs claim time if we had it.
  // Since we don't have claim time easily available, we can mock the 5-min timer for now 
  // or calculate it based on when the first order in the active batch was placed/ready.
  // We will assume 5 mins from NOW once they see this page for active deliveries.
  const [timeLeft, setTimeLeft] = useState(300) // 5 mins in seconds

  useEffect(() => {
    if (activeDeliveries.length > 0) {
      // Fallback to localStorage to ensure timer survives refreshes even without updated_at column
      const batchId = activeDeliveries.map(o => o.id).sort().join('-')
      let claimTime = localStorage.getItem(`batch_${batchId}`)
      if (!claimTime) {
        // First time seeing this batch
        claimTime = new Date().getTime().toString()
        localStorage.setItem(`batch_${batchId}`, claimTime)
      }
      
      const oldestUpdate = parseInt(claimTime)
      const now = new Date().getTime()
      const elapsedSeconds = Math.floor((now - oldestUpdate) / 1000)
      const initialTimeLeft = Math.max(300 - elapsedSeconds, 0)
      setTimeLeft(initialTimeLeft)

      const timer = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0)
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setTimeLeft(300)
    }
  }, [activeDeliveries.length])

  useEffect(() => {
    if (timeLeft === 0 && activeDeliveries.length > 0 && !showCollectionPrompt) {
      const batchId = activeDeliveries.map(o => o.id).sort().join('-')
      if (!localStorage.getItem(`prompted_${batchId}`)) {
        setShowCollectionPrompt(true)
        const { playRiderAlarm } = require('@/store/riderStore')
        playRiderAlarm()
      }
    }
  }, [timeLeft, activeDeliveries, showCollectionPrompt])

  const handleAcknowledgeCollection = () => {
    const batchId = activeDeliveries.map(o => o.id).sort().join('-')
    localStorage.setItem(`prompted_${batchId}`, 'true')
    setShowCollectionPrompt(false)
    const { stopRiderAlarm } = require('@/store/riderStore')
    stopRiderAlarm()
  }

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Collection Prompt Overlay */}
      <AnimatePresence>
        {showCollectionPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Bell size={32} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Time is up!</h2>
              <p className="text-gray-600 mb-6 text-sm">
                The 5-minute collection window has ended. Did you collect all the items from the shop?
              </p>
              <button
                onClick={handleAcknowledgeCollection}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition"
              >
                Yes, I collected them!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
          
          {Object.keys(groupedBatches).length > 0 && (
            <div className="space-y-4 mb-8">
              {Object.entries(groupedBatches).map(([shopId, batch]) => (
                <div key={shopId} className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase mb-2 inline-block">
                        Smart Batch Ready
                      </span>
                      <h3 className="font-bold text-gray-900 text-lg">{batch.shopName}</h3>
                      <p className="text-xs text-gray-600 font-medium mt-1">{batch.orders.length} orders in this batch</p>
                      
                      {/* Show destinations */}
                      <div className="mt-2 text-xs text-gray-500">
                        <p className="font-bold">Drop-offs:</p>
                        <ul className="list-disc pl-4 mt-1">
                          {Array.from(new Set(batch.orders.map(o => o.hostel_name))).map((hostel, idx) => (
                            <li key={idx}>{hostel}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Partner Add-ons Routing */}
                      {batch.orders.some(o => o.order_items?.some((i: any) => i.partner_shop_id)) && (
                        <div className="mt-3 bg-white bg-opacity-60 p-2 rounded-lg border border-orange-100">
                          <p className="text-xs font-bold text-[#F97316] uppercase tracking-wider mb-1">Pickup Route:</p>
                          <p className="text-[11px] font-medium text-gray-700">1. {batch.shopName} (Primary)</p>
                          {Array.from(new Set(
                            batch.orders.flatMap(o => 
                              o.order_items?.filter((i: any) => i.partner_shop_id).map((i: any) => i.partner?.name)
                            )
                          )).map((partnerName, idx) => (
                            <p key={idx} className="text-[11px] font-medium text-gray-700">2. {partnerName as string} (Add-ons)</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-bold text-orange-600">
                      ₹{batch.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleClaimBatch(shopId)}
                    className="w-full bg-[#F97316] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-orange-600 active:scale-95 transition mt-2"
                  >
                    Claim Batch ({batch.orders.length})
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-bold text-gray-900 mb-4 mt-8">Active Orders ({activeDeliveries.length})</h2>
          
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-3xl text-gray-400 mb-2 block">🛵</span>
              <h3 className="font-bold text-gray-900">No active batches</h3>
              <p className="text-gray-500 text-sm mt-1">Wait for the shop to assign you orders.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {/* Collection Timer */}
              {activeDeliveries.some(o => o.status === 'out_for_delivery') && (
                <div className={`p-4 rounded-xl border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'} flex justify-between items-center shadow-sm`}>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wider">Collection Window</p>
                    <p className="text-xs mt-0.5 opacity-80">Deliver within 25 mins</p>
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-widest">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}
              {/* Group active deliveries by shop */}
              {(() => {
                const byShop = activeDeliveries.reduce((acc, order) => {
                  const sid = order.shop_id
                  if (!acc[sid]) acc[sid] = { shopName: (order as any).shops?.name || 'Shop', orders: [] }
                  acc[sid].orders.push(order)
                  return acc
                }, {} as Record<string, { shopName: string, orders: any[] }>)

                return Object.entries(byShop).map(([shopId, shopGroup]) => {
                  const allItems = shopGroup.orders.flatMap(o => 
                    (o.order_items || []).map((item: any) => ({ ...item, _orderId: o.id, _orderNum: o.order_number, _hostel: o.hostel_name }))
                  )
                  const totalQty = allItems.reduce((sum, i) => sum + i.quantity, 0)
                  const hasExternal = allItems.some(i => !!i.partner_shop_id)

                  return (
                    <div key={shopId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                      {/* Shop Header */}
                      <div className="flex justify-between items-center bg-green-700 text-white px-5 py-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Active Batch</p>
                          <h3 className="font-bold text-base">{shopGroup.shopName}</h3>
                        </div>
                        <div className="text-right">
                          <span className="bg-white text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{totalQty} Items</span>
                          <p className="text-[10px] opacity-70 mt-1">{shopGroup.orders.length} orders</p>
                        </div>
                      </div>

                      <div className="px-5 py-3">
                        {/* External pickup note */}
                        {hasExternal && (
                          <div className="flex items-center gap-2 mb-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                            <span className="text-purple-600 text-xs font-bold">⚡ Collect add-ons from partner shops before delivery</span>
                          </div>
                        )}

                        {/* Orders separated by dividers */}
                        {shopGroup.orders.map((order: any, orderIdx: number) => (
                          <div key={order.id}>
                            {orderIdx > 0 && <hr className="my-3 border-dashed border-gray-200" />}
                            
                            {/* Order header row */}
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className="font-bold text-gray-800 text-sm">#{order.order_number}</span>
                                <span className="text-xs text-gray-500 ml-2">→ {order.hostel_name}</span>
                              </div>
                              <Link href={`/rider2/delivery/${order.id}`} className="text-[11px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold">
                                Deliver
                              </Link>
                            </div>

                            {/* Items */}
                            <div className="space-y-1.5">
                              {order.order_items?.map((item: any, idx: number) => {
                                const isExternal = !!item.partner_shop_id
                                const checkKey = `${order.id}-${item.id}`
                                const isChecked = checkedItems[checkKey]
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => toggleCheck(checkKey)}
                                    className={`flex justify-between items-center px-3 py-2 rounded-xl border transition cursor-pointer select-none ${
                                      isChecked
                                        ? 'bg-gray-50 border-gray-200 opacity-50'
                                        : isExternal
                                          ? 'bg-purple-50 border-purple-100'
                                          : 'bg-green-50 border-green-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                                        isChecked ? 'bg-gray-300' : isExternal ? 'bg-purple-500' : 'bg-green-500'
                                      }`}>
                                        {isChecked && <Check size={11} strokeWidth={3} className="text-white" />}
                                      </div>
                                      <span className={`text-sm font-bold ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {item.quantity}× {item.menu_items?.name || 'Item'}
                                      </span>
                                    </div>
                                    {isExternal && (
                                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                        {item.partner?.name}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              })()}
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
