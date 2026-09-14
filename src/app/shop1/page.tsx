'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem } from '@/types'
import { useShopOrdersStore, initShopAudio, playShopAlarm, stopShopAlarm } from '@/store/shopOrdersStore'
import { getShopActiveOrders } from '@/lib/supabase/queries/shop-dashboard'
import { Loader2, BellRing, CheckCircle, Package, Clock, Utensils, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Shop1Dashboard() {
  const [loading, setLoading] = useState(true)
  const [shopName, setShopName] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)
  
  const { orders, setOrders, isAlarmRinging } = useShopOrdersStore()

  useEffect(() => {
    async function loadShop() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Get their primary shop
        const { data: shop } = await supabase
          .from('shops')
          .select('id, name')
          .eq('owner_id', session.user.id)
          .single()

        if (shop) {
          setShopId(shop.id)
          setShopName(shop.name)
          
          // Initial load
          const activeOrders = await getShopActiveOrders(shop.id)
          setOrders(activeOrders)

          // Sub to realtime
          const channel = supabase
            .channel(`shop1-${shop.id}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` },
              async () => {
                await new Promise(r => setTimeout(r, 1000))
                const active = await getShopActiveOrders(shop.id)
                setOrders(active)
                playShopAlarm()
                toast.success('NEW ORDER ARRIVED!', { duration: 8000, icon: '🚨' })
              }
            )
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` },
              async () => {
                const active = await getShopActiveOrders(shop.id)
                setOrders(active)
              }
            )
            .subscribe()

          return () => {
            supabase.removeChannel(channel)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadShop()
    
    // Poll every 10s just in case
    const interval = setInterval(async () => {
      if (shopId) {
        const active = await getShopActiveOrders(shopId)
        setOrders(active)
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [shopId, setOrders])

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12" /></div>
  }

  const pending = orders.filter(o => o.status === 'pending')
  const preparing = orders.filter(o => o.status === 'preparing')
  const ready = orders.filter(o => o.status === 'ready')

  return (
    <div className="min-h-screen bg-[#111111] text-gray-100 p-4 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-black text-white">{shopName || 'Shop Dashboard'}</h1>
          <p className="text-gray-400 font-medium">Live Order Dashboard (Replica)</p>
        </div>
        <div className="flex gap-4">
          <a href="/shop/dashboard" className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-700 transition">
            Advanced Settings ⚙️
          </a>
          <button 
            onClick={() => {
              initShopAudio()
              toast.success('Audio unlocked!')
            }}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-700 transition"
          >
            Unlock Sound
          </button>
          {isAlarmRinging && (
            <button 
              onClick={stopShopAlarm}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold text-white transition animate-pulse flex items-center gap-2"
            >
              <BellRing size={18} /> STOP ALARM
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* NEW ORDERS */}
        <div className="flex flex-col gap-4">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Clock size={20} /> New Orders
            </h2>
            <span className="bg-blue-500 text-white font-bold px-3 py-1 rounded-full text-sm">{pending.length}</span>
          </div>
          {pending.length === 0 && <p className="text-gray-600 text-center py-10 font-medium">No new orders</p>}
          {pending.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {/* PREPARING */}
        <div className="flex flex-col gap-4">
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
              <Utensils size={20} /> Preparing
            </h2>
            <span className="bg-orange-500 text-white font-bold px-3 py-1 rounded-full text-sm">{preparing.length}</span>
          </div>
          {preparing.length === 0 && <p className="text-gray-600 text-center py-10 font-medium">None preparing</p>}
          {preparing.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {/* READY */}
        <div className="flex flex-col gap-4">
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
              <Package size={20} /> Ready
            </h2>
            <span className="bg-green-500 text-white font-bold px-3 py-1 rounded-full text-sm">{ready.length}</span>
          </div>
          {ready.length === 0 && <p className="text-gray-600 text-center py-10 font-medium">None ready</p>}
          {ready.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

      </div>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false)
  const [otpInput, setOtpInput] = useState('')

  const handleUpdate = async (status: string) => {
    setLoading(true)
    const supabase = createClient()
    
    // Zomato style logic: mark ready -> if delivery, alert rider. If dine-in, alert student.
    const updates: any = { status }
    if (status === 'delivered') updates.delivered_at = new Date().toISOString()
    
    await supabase.from('orders').update(updates).eq('id', order.id)
    setLoading(false)
  }

  const handleOTPComplete = async () => {
    if (otpInput !== order.delivery_otp) {
      toast.error('Invalid OTP!')
      return
    }
    await handleUpdate('delivered')
    toast.success('Order Completed!')
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl relative overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <Loader2 className="animate-spin text-white w-8 h-8" />
        </div>
      )}
      
      {/* Head */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-2xl font-black text-white block leading-none mb-1">{order.order_number}</span>
          <span className="text-gray-400 text-sm font-medium">
            {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-right">
          <span className="bg-gray-800 text-gray-200 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider block mb-1">
            {order.order_type}
          </span>
          <span className="text-orange-500 font-black text-lg">₹{order.total_amount}</span>
        </div>
      </div>

      {/* Items */}
      <div className="bg-[#222] rounded-xl p-3 mb-4 space-y-2">
        {order.order_items?.map((item: any, i: number) => (
          <div key={i} className="flex items-start justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-200 font-medium">
              <span className="bg-gray-800 w-6 h-6 flex items-center justify-center rounded text-orange-400 font-bold shrink-0">{item.quantity}x</span>
              <span>{item.menu_item_name} {item.variant_name ? `(${item.variant_name})` : ''}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-gray-800">
        {order.status === 'pending' && (
          <button 
            onClick={() => handleUpdate('preparing')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition text-lg shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            ACCEPT ORDER
          </button>
        )}
        
        {order.status === 'preparing' && (
          <button 
            onClick={() => handleUpdate('ready')}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl transition text-lg shadow-[0_0_20px_rgba(234,88,12,0.2)]"
          >
            MARK FOOD READY
          </button>
        )}

        {order.status === 'ready' && (
          <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 mt-2">
            <p className="text-green-400 font-bold text-center mb-3 text-sm">
              {order.order_type === 'delivery' ? 'Waiting for Rider' : 'Waiting for Student'}
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                maxLength={4}
                placeholder="OTP"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                className="w-full bg-black border-2 border-green-500/50 rounded-xl text-center text-2xl font-black tracking-[0.5em] text-white placeholder-gray-700 focus:outline-none focus:border-green-400"
              />
              <button 
                onClick={handleOTPComplete}
                className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-black transition"
              >
                VERIFY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
