'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Phone, MapPin, CheckCircle2 } from 'lucide-react'
import { useRiderStore } from '@/store/riderStore'
import { completeDelivery } from '@/lib/supabase/queries/rider'
import SwipeButton from '@/components/rider/SwipeButton'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export default function ActiveDeliveryPage() {
  const router = useRouter()
  const { orderId } = useParams()
  const { activeDelivery, setActiveDelivery } = useRiderStore()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [step, setStep] = useState<'pickup' | 'dropoff'>('pickup')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // If the active delivery in store matches the URL, use it immediately
    if (activeDelivery && activeDelivery.id === orderId) {
      setOrder(activeDelivery)
      setIsLoading(false)
      return
    }

    // Otherwise, fetch it (in case of page refresh)
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('orders')
          .select(`*, shops(name, description)`)
          .eq('id', orderId)
          .single()
        
        if (error) throw error
        setOrder(data)
        setActiveDelivery(data)
      } catch (err) {
        toast.error('Delivery not found')
        router.replace('/rider/pool')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [orderId, activeDelivery, setActiveDelivery, router])

  if (isLoading) return <div className="p-10 text-center font-bold text-green-700">Loading delivery details...</div>
  if (!order) return null

  const handlePickup = () => {
    setStep('dropoff')
    toast.success('Navigating to student!')
  }

  const handleDelivered = async () => {
    try {
      await completeDelivery(order.id)
      setActiveDelivery(null)
      toast.success('Delivery Completed! ₹' + order.delivery_fee + ' earned.', { icon: '💰' })
      router.replace('/rider/earnings')
    } catch (err) {
      toast.error('Failed to complete delivery')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Faux Map Background Graphic */}
      <div className="h-64 bg-green-100 border-b-4 border-[#16A34A] relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#16A34A 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        
        {/* Dynamic Map Pins */}
        {step === 'pickup' ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-[#16A34A]">
              <span className="text-2xl">🏪</span>
            </div>
            <div className="mt-2 bg-[#16A34A] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              Head to Shop
            </div>
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-[#16A34A]">
              <span className="text-2xl">🎓</span>
            </div>
            <div className="mt-2 bg-[#16A34A] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              Head to Hostel
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white -mt-6 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)] relative z-10 px-6 pt-8 pb-32 flex flex-col">
        
        {/* Header Badges */}
        <div className="flex justify-between items-center mb-6">
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
            Order {order.order_number}
          </span>
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg">
            Earn ₹{order.delivery_fee}
          </span>
        </div>

        {/* Dynamic Card Content */}
        {step === 'pickup' ? (
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{order.shops?.name}</h2>
            <p className="text-gray-500 font-medium text-sm flex items-start gap-2 mb-6">
              <MapPin size={16} className="mt-0.5 text-[#16A34A]" />
              {order.shops?.description || 'Pickup from counter'}
            </p>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Order Items</h3>
              <ul className="space-y-2">
                {order.order_items?.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-gray-700 text-sm font-medium">
                    <span>{item.quantity}x {item.item_name}</span>
                  </li>
                ))}
              </ul>
              {order.special_note && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1">Note:</p>
                  <p className="text-sm font-medium text-gray-800">{order.special_note}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{order.hostel_name}</h2>
            <p className="text-[#16A34A] font-bold text-lg flex items-center gap-2 mb-6 bg-green-50 w-max px-4 py-2 rounded-xl">
              Room {order.room_number}
            </p>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                <p className="font-bold text-gray-900">Student</p>
              </div>
              <button className="w-12 h-12 bg-[#16A34A] rounded-full flex items-center justify-center text-white shadow-md shadow-green-200 active:scale-95 transition">
                <Phone size={20} />
              </button>
            </div>
            
            <div className="mt-6 flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800">
              <CheckCircle2 size={24} className="flex-shrink-0" />
              <p className="text-sm font-medium">Verify the order number <strong>{order.order_number}</strong> with the student before handing over the food.</p>
            </div>
          </div>
        )}

        {/* Action Button at Bottom */}
        <div className="mt-auto pt-6 pb-2">
          {step === 'pickup' ? (
            <button 
              onClick={handlePickup} 
              className="w-full bg-[#16A34A] hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
            >
              Confirm Pickup
            </button>
          ) : (
            <button 
              onClick={handleDelivered} 
              className="w-full bg-[#16A34A] hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={24} /> Mark as Delivered
            </button>
          )}
        </div>
        
      </div>
    </div>
  )
}
