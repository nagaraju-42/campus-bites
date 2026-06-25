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
import OrderTimeCard from '@/components/shared/OrderTimeCard'
import { formatCurrency } from '@/lib/utils'

export default function Rider2DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { activeDeliveries, availableOrders, removeAvailableOrder, addActiveDelivery, isOnline, setIsOnline, dedicatedShopId } = useRiderStore()
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([])
  const { isSupported: isWakeSupported, isAwake, toggle: toggleWake } = useWakeLock()
  const [pushEnabled, setPushEnabled] = useState(false)
  
  // Interactive KDS Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

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
        .select(`
          *,
          shops(name),
          order_items(*, partner:partner_shop_id(name))
        `)
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
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          setPushEnabled(true);
          toast.success('Native Push Notifications enabled!');
        } else {
          toast.error('Push permission denied.');
        }
      } else {
        const success = await registerPushNotifications(user.id)
        if (success) {
          setPushEnabled(true)
          toast.success('Web Push Notifications enabled!')
        } else {
          toast.error('Failed to enable notifications')
        }
      }
    } catch (err: any) {
      console.warn('Push registration skipped:', err.message)
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
      
      const { batchStartTime, setBatchStartTime } = useRiderStore.getState()
      if (!batchStartTime) {
        setBatchStartTime(Date.now())
      }
      
      toast.success(`Claimed batch of ${batchOrders.length} orders! Proceed to pickup.`)
    } catch (err: any) {
      toast.error('Failed to claim batch. Someone else might have claimed it.')
    }
  }

  // Filter pool by Dedicated Shop Mode if active
  const filteredAvailableOrders = dedicatedShopId 
    ? availableOrders.filter(o => o.shop_id === dedicatedShopId)
    : availableOrders

  // Calculate grouped batches
  const groupedBatches = filteredAvailableOrders.reduce((acc, order) => {
    if (!acc[order.shop_id]) acc[order.shop_id] = { shopName: order.shops?.name || 'Unknown Shop', orders: [] }
    acc[order.shop_id].orders.push(order)
    return acc
  }, {} as Record<string, { shopName: string, orders: any[] }>)



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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-600 font-medium">{batch.orders.length} order{batch.orders.length > 1 ? 's' : ''} in this batch</p>
                        <OrderTimeCard placedAt={new Date(Math.min(...batch.orders.map((o: any) => new Date(o.placed_at).getTime()))).toISOString()} />
                      </div>
                      
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
                        {/* Orders Grouped by Hostel */}
                        {Object.entries(
                          shopGroup.orders.reduce((acc, order: any) => {
                            const hostel = order.hostel_name || 'Unknown Location'
                            if (!acc[hostel]) acc[hostel] = []
                            acc[hostel].push(order)
                            return acc
                          }, {} as Record<string, any[]>)
                        ).map(([hostelName, hostelOrders], hostelIdx) => (
                          <div key={hostelName} className="mb-4 last:mb-0">
                            {hostelIdx > 0 && <hr className="my-4 border-dashed border-gray-200" />}
                            
                            {/* Hostel Sub-header */}
                            <div className="flex items-center gap-2 mb-3 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
                              <span className="text-green-700">📍</span>
                              <span className="font-bold text-green-900 text-sm flex-1">{hostelName}</span>
                              <span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                {(hostelOrders as any[]).length} {(hostelOrders as any[]).length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>

                            {/* Orders for this hostel */}
                            <div className="space-y-4">
                              {(hostelOrders as any[]).map((order: any, orderIdx: number) => (
                                <Link key={order.id} href={`/rider2/delivery/${order.id}`} className="block pl-2 border-l-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100 rounded-xl p-2 -ml-2 transition">
                                  {/* Order header row */}
                                  <div className="flex justify-between items-center mb-2">
                                    <div>
                                      <span className="font-bold text-gray-800 text-sm">#{order.order_number}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      Tap to open
                                    </span>
                                  </div>

                                  {/* Items */}
                                  <div className="space-y-1.5">
                                    {order.order_items?.map((item: any, idx: number) => {
                                      const isExternal = !!item.partner_shop_id
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex justify-between items-center px-3 py-2 rounded-xl border ${
                                            isExternal
                                              ? 'bg-purple-50 border-purple-100'
                                              : 'bg-green-50 border-green-100'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${item.item_name?.startsWith('[UNAVAILABLE]') ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                              {item.quantity}× {item.item_name?.replace('[UNAVAILABLE] ', '') || item.menu_items?.name || 'Item'}
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
                                </Link>
                              ))}
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
