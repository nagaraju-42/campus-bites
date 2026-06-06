'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Phone, MapPin, CheckCircle2, MessageSquare, X, Send } from 'lucide-react'
import { useRiderStore } from '@/store/riderStore'
import { useAuthStore } from '@/store/authStore'
import { completeDelivery } from '@/lib/supabase/queries/rider'

import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'

export default function ActiveDeliveryPage() {
  const router = useRouter()
  const { orderId } = useParams()
  const { activeDeliveries, setActiveDeliveries, removeActiveDelivery, pickedUpOrders, markOrderPickedUp, removePickedUpOrder } = useRiderStore()
  const { user } = useAuthStore()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [step, setStep] = useState<'pickup' | 'dropoff'>('pickup')
  const [isLoading, setIsLoading] = useState(true)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  const toggleItem = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  useEffect(() => {
    // If the active delivery in store matches the URL, use it immediately
    const storeDelivery = activeDeliveries.find(d => d.id === orderId)
    if (storeDelivery) {
      setOrder(storeDelivery)
      setIsLoading(false)
      return
    }

    // Otherwise, fetch it (in case of page refresh)
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('orders')
          .select(`*, shops(name, description), profiles!student_id(full_name, phone), order_items(*, partner:partner_shop_id(name))`)
          .eq('id', orderId)
          .single()
        
        if (error) throw error
        setOrder(data)
        // Optionally we could add it to activeDeliveries here, but we'll skip modifying the store if it's already complete
      } catch (err) {
        toast.error('Delivery not found')
        router.replace('/rider2/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [orderId, activeDeliveries, router])

  useEffect(() => {
    if (typeof orderId === 'string' && pickedUpOrders.includes(orderId)) {
      setStep('dropoff')
    }
  }, [orderId, pickedUpOrders])

  if (isLoading) return <div className="p-10 text-center font-bold text-green-700">Loading delivery details...</div>
  if (!order) return null

  const handlePickup = () => {
    if (typeof orderId === 'string') {
      markOrderPickedUp(orderId)
    }
    setStep('dropoff')
    toast.success('Navigating to student!')
  }

  const handleDeliveredClick = () => {
    setIsOtpModalOpen(true)
  }

  const handleConfirmOtp = async () => {
    if (otpInput !== (order as any).delivery_otp) {
      toast.error('Invalid OTP. Please check with the student.')
      return
    }
    try {
      await completeDelivery(order.id, user?.id || '')
      
      removeActiveDelivery(order.id)
      removePickedUpOrder(order.id)
      toast.success('Delivery Completed! ₹' + (order as any).delivery_fee + ' earned.', { icon: '💰' })
      router.replace('/rider2/dashboard')
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
          <div className="flex gap-2">
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
              Order {order.order_number}
            </span>
            {activeDeliveries.length > 1 && (
              <button 
                onClick={() => router.push('/rider2/active')}
                className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider active:scale-95 transition"
              >
                Batch ({activeDeliveries.length})
              </button>
            )}
          </div>

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
              <div className="space-y-3">
                {/* Primary Items */}
                {order.order_items?.filter(i => !i.partner_shop_id || i.partner_shop_id === order.shop_id).map((item, idx) => {
                  const originalIdx = order.order_items!.findIndex(i => i === item);
                  const isChecked = checkedItems[originalIdx];
                  return (
                    <div 
                      key={`p-${originalIdx}`} 
                      onClick={() => toggleItem(originalIdx)}
                      className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked ? 'bg-green-50 border-green-200 text-gray-400 opacity-60' : 'bg-white border-gray-100 text-gray-800 shadow-sm'
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                          {isChecked && <span className="text-xs font-bold">✓</span>}
                        </div>
                        <span className={`font-bold ${isChecked ? 'line-through' : ''}`}>{item.quantity}x {item.item_name}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Secondary Items */}
                {order.order_items?.some(i => i.partner_shop_id && i.partner_shop_id !== order.shop_id) && (
                  <div className="mt-4 bg-purple-50 rounded-2xl p-4 border border-purple-100">
                    <p className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-3">Partner Add-ons</p>
                    <div className="space-y-2">
                      {order.order_items?.filter(i => i.partner_shop_id && i.partner_shop_id !== order.shop_id).map((item, idx) => {
                        const originalIdx = order.order_items!.findIndex(i => i === item);
                        const isChecked = checkedItems[originalIdx];
                        return (
                          <div 
                            key={`s-${originalIdx}`} 
                            onClick={() => toggleItem(originalIdx)}
                            className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked ? 'bg-purple-100 border-purple-200 text-purple-400 opacity-60' : 'bg-white border-purple-100 text-purple-900 shadow-sm'
                            }`}
                          >
                            <div className="flex gap-3 items-center">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-purple-500 border-purple-500 text-white' : 'border-purple-300'}`}>
                                {isChecked && <span className="text-xs font-bold">✓</span>}
                              </div>
                              <span className={`font-bold ${isChecked ? 'line-through' : ''}`}>{item.quantity}x {item.item_name}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
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
            <p className="text-[#16A34A] font-bold text-xs uppercase tracking-wider mb-2">
              Delivery Address
            </p>
            <h2 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed whitespace-pre-line bg-green-50 p-4 rounded-xl border border-green-100">
              📍 {order.hostel_name}
            </h2>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                <p className="font-bold text-gray-900 text-lg">{(order as any).profiles?.full_name || 'Student'}</p>
                <p className="text-sm font-medium text-gray-500">Order #{order.order_number}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsMessageModalOpen(true)}
                  className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm active:scale-95 transition"
                >
                  <MessageSquare size={20} />
                </button>
                <a 
                  href={`tel:+91${(order as any).profiles?.phone || ''}`}
                  className="w-12 h-12 bg-[#16A34A] rounded-full flex items-center justify-center text-white shadow-md shadow-green-200 active:scale-95 transition"
                >
                  <Phone size={20} />
                </a>
              </div>
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
              onClick={handleDeliveredClick} 
              className="w-full bg-[#16A34A] hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={24} /> Enter OTP to Deliver
            </button>
          )}
        </div>
        
      </div>

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Message Student</h3>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. I have reached the hostel gate."
              className="w-full border border-gray-200 rounded-xl p-3 h-24 mb-4 focus:outline-none focus:border-green-500 resize-none"
            />
            <button
              onClick={async () => {
                if (!messageText.trim()) return
                setIsSending(true)
                try {
                  const supabase = createClient()
                  await supabase.from('notifications').insert({
                    user_id: order.student_id,
                    title: 'Message from Rider',
                    message: messageText,
                    type: 'message'
                  })
                  toast.success('Message sent!')
                  setMessageText('')
                  setIsMessageModalOpen(false)
                } catch (err) {
                  toast.error('Failed to send message')
                } finally {
                  setIsSending(false)
                }
              }}
              disabled={isSending || !messageText.trim()}
              className="w-full bg-[#16A34A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">
              🔐
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 mb-1">Enter Delivery OTP</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Ask the student for their 4-digit PIN to confirm handover.</p>
            
            <input
              type="text"
              maxLength={4}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0000"
              className="text-center text-4xl font-mono font-bold tracking-[0.5em] w-full border-2 border-gray-200 rounded-2xl py-4 mb-6 focus:outline-none focus:border-[#16A34A] transition"
            />
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setIsOtpModalOpen(false); setOtpInput(''); }}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOtp}
                disabled={otpInput.length !== 4}
                className="flex-1 bg-[#16A34A] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 disabled:opacity-50 transition active:scale-95"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
