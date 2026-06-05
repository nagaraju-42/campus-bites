'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, MessageSquare, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrderById, cancelOrderAsStudent } from '@/lib/supabase/queries/orders'
import { getOrderAuditLogs } from '@/lib/supabase/queries/admin'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, getOrderStatusStep, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import OrderChat from '@/components/shared/OrderChat'

// STATUS_STEPS moved inside component

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [riderMode, setRiderMode] = useState(true)
  const { user } = require('@/store/authStore').useAuthStore()

  useEffect(() => {
    async function loadData() {
      const data = await getOrderById(orderId)
      setOrder(data)
      try {
        const supabase = createClient()
        const { data: settings } = await supabase.from('app_settings').select('rider_mode').limit(1).single()
        if (settings) setRiderMode(settings.rider_mode)
      } catch (e) {}

      try {
        const logs = await getOrderAuditLogs(orderId)
        setAuditLogs(logs)
      } catch (e) {
        // logs might fail if empty or no permissions, safe to ignore
      }
      setIsLoading(false)
    }
    loadData()

    const supabase = createClient()
    const subscription = supabase
      .channel(`order-track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, async (payload) => {
        setOrder((prev) => prev ? { ...prev, status: payload.new.status as OrderStatus } : prev)
        // Also refresh logs when status updates
        try {
          const logs = await getOrderAuditLogs(orderId)
          setAuditLogs(logs)
        } catch (e) {}
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [orderId])

  if (isLoading) return <div className="p-5 max-w-[430px] mx-auto"><div className="h-64 bg-gray-200 rounded-2xl animate-pulse" /></div>
  if (!order) return <div className="p-5 text-center text-gray-500 max-w-[430px] mx-auto">Order not found</div>

  const isDineIn = order.order_type === 'dine_in' || order.hostel_name?.includes('[Dine-In]')


  const currentStep = getOrderStatusStep(order.status)

  const getTimeForStatus = (status: string, fallback: string) => {
    const log = auditLogs.find(l => l.status_to === status)
    return log ? formatDate(log.created_at) : fallback
  }

  const handleCancelOrder = async () => {
    const reason = window.prompt("Why do you want to cancel this order? (Required)")
    if (!reason || !reason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }
    
    try {
      await cancelOrderAsStudent(orderId, user?.id || '', reason.trim())
      toast.success('Order cancelled successfully')
      // Status will auto-update via realtime channel
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order')
    }
  }

  let STATUS_STEPS = [
    { step: 1, label: 'Order Placed', time: formatDate(order.placed_at), status: 'pending', color: 'text-gray-600' },
    { step: 2, label: 'Preparing', time: getTimeForStatus('preparing', currentStep >= 2 ? 'In Progress' : 'Upcoming'), status: 'preparing', color: 'text-orange-500' },
    { step: 3, label: 'Ready', time: getTimeForStatus('ready', currentStep >= 3 ? 'Ready for Pickup' : 'Upcoming'), status: 'ready', color: 'text-green-500' },
    { step: 4, label: 'Out for Delivery', time: getTimeForStatus('out_for_delivery', currentStep >= 4 ? 'Rider is on the way' : 'Upcoming'), status: 'out_for_delivery', color: 'text-blue-500' },
    { step: 5, label: 'Delivered', time: getTimeForStatus('delivered', order.status === 'delivered' && order.delivered_at ? formatDate(order.delivered_at) : 'Upcoming'), status: 'delivered', color: 'text-[#16A34A]' },
  ]

  if (isDineIn) {
    STATUS_STEPS = [
      { step: 1, label: 'Order Placed', time: formatDate(order.placed_at), status: 'pending', color: 'text-gray-600' },
      { step: 2, label: 'Preparing', time: getTimeForStatus('preparing', currentStep >= 2 ? 'In Progress' : 'Upcoming'), status: 'preparing', color: 'text-orange-500' },
      { step: 3, label: 'Served', time: getTimeForStatus('delivered', order.status === 'delivered' && order.delivered_at ? formatDate(order.delivered_at) : 'Upcoming'), status: 'delivered', color: 'text-[#16A34A]' },
    ]
  }

  return (
    <div className="min-h-screen bg-white max-w-[430px] mx-auto pb-24 border-x border-gray-100 shadow-sm">
      {/* Header (White) */}
      <div className="bg-white px-5 pt-12 pb-4 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3 text-gray-900">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-display font-bold flex-1">Order Tracking</h1>
        </div>
        <button 
          onClick={() => setShowChat(true)}
          className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm"
        >
          <MessageSquare size={20} />
        </button>
      </div>

      <div className="px-5 py-2">
        <p className="text-gray-900 font-bold text-sm mb-1">Order ID: {order.order_number}</p>
        <p className="text-gray-500 text-xs font-medium">Placed on {formatDate(order.placed_at)}</p>
      </div>

      {order.status === 'cancelled' && (
        <div className="mx-5 my-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-red-700 font-bold text-sm flex items-center gap-2">
            <X size={16} /> Order Cancelled
          </h3>
          <p className="text-red-600 text-xs mt-1">
            {order.cancellation_reason ? `Reason: ${order.cancellation_reason}` : 'This order has been cancelled.'}
          </p>
        </div>
      )}

      <div className="px-5 py-6">
        {/* Status Timeline */}
        <div className="space-y-0 relative ml-2">
          {/* Vertical Line */}
          <div className="absolute top-4 left-[11px] bottom-12 w-0.5 bg-gray-100 z-0"></div>
          
          {STATUS_STEPS.map(({ step, label, time, color }) => {
            const isCompleted = currentStep >= step
            const isActive = currentStep === step
            const iconColor = isActive ? color : isCompleted ? 'text-[#16A34A]' : 'text-gray-300'
            
            return (
              <div key={step} className="flex items-start gap-4 pb-8 relative z-10">
                <div className="flex flex-col items-center bg-white py-1">
                  {isCompleted ? (
                    <motion.div animate={isActive ? { scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
                      <CheckCircle2 size={24} className={`${iconColor} bg-white rounded-full`} fill="currentColor" stroke="white" />
                    </motion.div>
                  ) : (
                    <Circle size={24} className="text-gray-300 bg-white rounded-full" />
                  )}
                </div>
                <div className="pt-1.5">
                  <p className={`text-sm font-bold ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                    {label}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${isActive ? iconColor : 'text-gray-400'}`}>
                    {time}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Info Section (Fixed) */}
      <div className="px-5 mt-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-30 space-y-3">
        
        {/* OTP Delivery Box */}
        {!order.hostel_name?.includes('[Dine-In]') && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="bg-gray-900 rounded-2xl p-4 text-center shadow-2xl">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Delivery OTP</p>
            <p className="text-white text-3xl font-mono font-bold tracking-[0.25em]">{(order as any).delivery_otp || '----'}</p>
            <p className="text-gray-500 text-[10px] mt-1 uppercase font-bold">Share this PIN with rider</p>
          </div>
        )}

        {/* Rider Info Card (Dynamic) */}
        {!isDineIn && riderMode && (
          order.rider_id && order.rider ? (
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">
                👨‍🦰
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{order.rider.full_name}</p>
                <p className="text-gray-500 text-xs font-medium">Your delivery partner</p>
              </div>
            </div>
          ) : order.status === 'ready' || order.status === 'preparing' || order.status === 'pending' ? (
            <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ) : null
        )}

        {/* Cancel Logic */}
        {(() => {
          if (order.status === 'delivered' || order.status === 'cancelled') return null;

          const isPending = order.status === 'pending';
          const placedAt = new Date(order.placed_at);
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isWithin5Mins = placedAt > fiveMinsAgo;

          if (isPending && isWithin5Mins) {
            return (
              <button 
                onClick={handleCancelOrder}
                className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-3.5 rounded-2xl shadow-sm hover:bg-red-50 transition active:scale-95 flex items-center justify-center gap-2"
              >
                Cancel Order
              </button>
            )
          } else {
            return (
              <a 
                href={`tel:${order.shops?.phone || ''}`}
                className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-3.5 rounded-2xl shadow-sm hover:bg-red-50 transition active:scale-95 flex items-center justify-center gap-2"
                onClick={() => toast('Please call the shop to cancel this order as preparation has started or 5 minutes have passed.', { icon: '📞' })}
              >
                Call and Cancel Order
              </a>
            )
          }
        })()}
      </div>

      {/* Chat Slide-up Drawer */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="fixed inset-0 bg-black/40 z-40 max-w-[430px] mx-auto" 
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 overflow-hidden shadow-2xl flex flex-col h-[70vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><MessageSquare size={18} className="text-[#2563EB]"/> Shop Support</h3>
                <button onClick={() => setShowChat(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 bg-gray-50 p-2 overflow-hidden">
                <div className="h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <OrderChat orderId={orderId} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
