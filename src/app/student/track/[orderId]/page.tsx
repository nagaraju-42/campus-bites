'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrderById } from '@/lib/supabase/queries/orders'
import { Order, OrderStatus } from '@/types'
import { formatCurrency, getOrderStatusStep } from '@/lib/utils'
import { motion } from 'framer-motion'

const STATUS_STEPS = [
  { step: 1, label: 'Order Placed', time: '12 May, 4:30 PM', status: 'pending', color: 'text-gray-600' },
  { step: 2, label: 'Preparing', time: '12 May, 4:35 PM', status: 'preparing', color: 'text-orange-500' },
  { step: 3, label: 'Ready', time: '12 May, 4:45 PM', status: 'ready', color: 'text-green-500' },
  { step: 4, label: 'Out for Delivery', time: 'Rider is on the way', status: 'out_for_delivery', color: 'text-blue-500' },
  { step: 5, label: 'Delivered', time: 'Upcoming', status: 'delivered', color: 'text-[#16A34A]' },
]

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadOrder() {
      const data = await getOrderById(orderId)
      setOrder(data)
      setIsLoading(false)
    }
    loadOrder()

    const supabase = createClient()
    const subscription = supabase
      .channel(`order-track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev) => prev ? { ...prev, status: payload.new.status as OrderStatus } : prev)
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [orderId])

  if (isLoading) return <div className="p-5 max-w-[430px] mx-auto"><div className="h-64 bg-gray-200 rounded-2xl animate-pulse" /></div>
  if (!order) return <div className="p-5 text-center text-gray-500 max-w-[430px] mx-auto">Order not found</div>

  const currentStep = getOrderStatusStep(order.status)

  return (
    <div className="min-h-screen bg-white max-w-[430px] mx-auto pb-24 border-x border-gray-100 shadow-sm">
      {/* Header (White) */}
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 text-gray-900">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-display font-bold flex-1">Order Tracking</h1>
        </div>
      </div>

      <div className="px-5 py-2">
        <p className="text-gray-900 font-bold text-sm mb-1">Order ID: {order.order_number}</p>
        <p className="text-gray-500 text-xs font-medium">Placed on 12 May, 4:30 PM</p>
      </div>

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

      {/* Rider Info Card (Dynamic) */}
      {order.rider_id && order.rider ? (
        <div className="px-5 mt-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-30">
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">
              👨‍🦰
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{order.rider.full_name}</p>
              <p className="text-gray-500 text-xs font-medium">Your delivery partner</p>
            </div>
          </div>
        </div>
      ) : order.status === 'ready' || order.status === 'preparing' ? (
        <div className="px-5 mt-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-30">
          <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
