'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Phone, MapPin, CheckCircle2, MessageSquare, X, Send, QrCode } from 'lucide-react'
import { useRiderStore } from '@/store/riderStore'
import { useAuthStore } from '@/store/authStore'
import { completeDelivery } from '@/lib/supabase/queries/rider'
import { formatCurrency } from '@/lib/utils'

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
  const [showQR, setShowQR] = useState(false)

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
          .select(`*, shops(name, description, phone, qr_code_url, upi_id), profiles!student_id(full_name, phone), order_items(*, partner:partner_shop_id(name))`)
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

  const handleFailDelivery = async () => {
    const reason = prompt('Reason for failure (e.g., Student unavailable):')
    if (!reason) return;

    try {
      const supabase = createClient()
      const failReason = `Failed Delivery: ${reason}`
      const appendReason = order!.special_note ? `${order!.special_note} | Rider Cancel: ${failReason}` : `Rider Cancel: ${failReason}`
      
      const { error } = await supabase.from('orders').update({ status: 'cancelled', special_note: appendReason }).eq('id', order!.id)
      
      if (error) {
        console.error("Supabase update error:", error)
        toast.error('Failed to update order status')
        return
      }
      
      removeActiveDelivery(order!.id)
      removePickedUpOrder(order!.id)
      toast.success('Order marked as failed and returned to shop.')
      router.replace('/rider2/dashboard')
    } catch (err) {
      toast.error('Failed to update order status')
    }
  }

  const handleReduceQuantity = async (item: any) => {
    if (!confirm(`Reduce quantity of "${item.item_name}" by 1? The student's total will be dynamically reduced.`)) return;

    try {
      const supabase = createClient();
      const newQuantity = item.quantity - 1;
      const isNowUnavailable = newQuantity === 0;
      
      const newName = isNowUnavailable ? `[UNAVAILABLE] ${item.item_name.replace('[UNAVAILABLE] ', '')}` : item.item_name;
      
      // Update item name and quantity in DB
      await supabase.from('order_items').update({ 
        item_name: newName,
        quantity: newQuantity > 0 ? newQuantity : 0
      }).eq('id', item.id);
      
      // Update order total in DB
      const reduction = item.unit_price || 0;
      const newTotal = Math.max(0, order!.total_amount - reduction);
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order!.id);
      
      // Mutate local state so UI updates immediately
      setOrder(prev => {
        if (!prev) return prev;
        const newItems = prev.order_items?.map(i => i.id === item.id ? { 
          ...i, 
          item_name: newName,
          quantity: newQuantity > 0 ? newQuantity : 0
        } : i);
        return { ...prev, total_amount: newTotal, order_items: newItems };
      });
      
      // Also update the global activeDeliveries store so dashboard reflects it
      setActiveDeliveries(activeDeliveries.map(d => d.id === order!.id ? { 
        ...d, 
        total_amount: newTotal,
        order_items: d.order_items?.map((i: any) => i.id === item.id ? { 
          ...i, 
          item_name: newName,
          quantity: newQuantity > 0 ? newQuantity : 0
        } : i)
      } : d));
      
      toast.success(isNowUnavailable ? 'Item marked unavailable. Fare updated!' : 'Quantity reduced. Fare updated!');
    } catch (err) {
      toast.error('Failed to update item');
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
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{order.shops?.name}</h2>
              {order.shops?.phone && (
                <a 
                  href={`tel:+91${order.shops.phone.replace('+91', '')}`}
                  className="bg-[#16A34A] text-white p-2 rounded-full shadow-sm active:scale-95 transition"
                >
                  <Phone size={16} />
                </a>
              )}
            </div>
            <p className="text-gray-500 font-medium text-sm flex items-start gap-2 mb-6">
              <MapPin size={16} className="mt-0.5 text-[#16A34A]" />
              {order.shops?.description || 'Pickup from counter'}
            </p>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Deliver To</p>
                <p className="font-bold text-blue-900 text-sm">{(order as any).profiles?.full_name || 'Student'}</p>
              </div>
              <a 
                href={`tel:+91${((order as any).profiles?.phone || '').replace('+91', '')}`}
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm active:scale-95 transition"
              >
                <Phone size={16} />
              </a>
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
                  href={`tel:+91${((order as any).profiles?.phone || '').replace('+91', '')}`}
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

        {/* Global Order Items visible in BOTH Steps */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mt-6">
          <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Order Items</h3>
          <div className="space-y-3">
            {/* Primary Items */}
            {order.order_items?.filter(i => !i.partner_shop_id || i.partner_shop_id === order.shop_id).map((item, idx) => {
              const originalIdx = order.order_items!.findIndex(i => i === item);
              const isUnavailable = item.item_name.startsWith('[UNAVAILABLE]');
              return (
                <div key={`p-${originalIdx}`} className="flex items-center gap-2">
                  <div className={`flex-1 p-3 rounded-xl border ${isUnavailable ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <span className={`font-bold ${isUnavailable ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.quantity}x {item.item_name.replace('[UNAVAILABLE] ', '')}
                    </span>
                  </div>
                  {!isUnavailable && (
                    <button
                      onClick={() => handleReduceQuantity(item)}
                      className="w-12 h-12 flex-shrink-0 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl border border-amber-100 flex items-center justify-center transition active:scale-95"
                      title="Reduce Quantity"
                    >
                      <span className="text-2xl font-bold mb-1">-</span>
                    </button>
                  )}
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
                    const isUnavailable = item.item_name.startsWith('[UNAVAILABLE]');
                    return (
                      <div key={`s-${originalIdx}`} className="flex items-center gap-2">
                        <div className={`flex-1 p-3 rounded-xl border ${isUnavailable ? 'bg-purple-100/50 border-purple-200' : 'bg-white border-purple-100 shadow-sm'}`}>
                          <span className={`font-bold ${isUnavailable ? 'text-purple-400 line-through' : 'text-purple-900'}`}>
                            {item.quantity}x {item.item_name.replace('[UNAVAILABLE] ', '')}
                          </span>
                        </div>
                        {!isUnavailable && (
                          <button
                            onClick={() => handleReduceQuantity(item)}
                            className="w-12 h-12 flex-shrink-0 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl border border-amber-100 flex items-center justify-center transition active:scale-95"
                            title="Reduce Quantity"
                          >
                            <span className="text-2xl font-bold mb-1">-</span>
                          </button>
                        )}
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

        {/* Fare Summary & Payment Collection */}
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Fare</p>
                <div className="flex flex-col items-start">
                  {(() => {
                    const unavailableItems = order.order_items?.filter((i: any) => i.item_name.startsWith('[UNAVAILABLE]')) || []
                    if (unavailableItems.length > 0) {
                      const originalTotal = order.total_amount + unavailableItems.reduce((sum: number, i: any) => sum + (i.quantity * (i.unit_price || 0)), 0)
                      return (
                        <>
                          <span className="text-xs font-bold text-gray-400 line-through mb-0.5">{formatCurrency(originalTotal)}</span>
                          <span className="font-bold text-2xl text-gray-900">{formatCurrency(order.total_amount)}</span>
                        </>
                      )
                    }
                    return <span className="font-bold text-2xl text-gray-900">{formatCurrency(order.total_amount)}</span>
                  })()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  order.payment_method === 'UPI' ? 'bg-green-100 text-[#16A34A]' : 'bg-orange-100 text-orange-600'
                }`}>
                  {order.payment_method === 'cash_on_delivery' ? 'Cash / UPI' : 'Prepaid'}
                </span>
              </div>
            </div>

            {/* Collection Breakdown */}
            {(() => {
              let primaryCash = 0;
              let secondaryCash = 0;
              const secondaryBreakdown: Record<string, number> = {};
              const deliveryFees = order.delivery_fee || 10;
              
              const items = order.order_items || [];
              items.forEach((item: any) => {
                if (item.item_name && item.item_name.startsWith('[UNAVAILABLE]')) return;
                const amount = item.quantity * (item.unit_price || 0);
                if (item.partner_shop_id && item.partner_shop_id !== order.shop_id) {
                  secondaryCash += amount;
                  const partnerName = item.partner?.name || 'Partner Shop';
                  secondaryBreakdown[partnerName] = (secondaryBreakdown[partnerName] || 0) + amount;
                } else {
                  primaryCash += amount;
                }
              });

              return (
                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Collection Split</p>
                  <div className="flex justify-between">
                    <span>Primary Shop items:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(primaryCash)}</span>
                  </div>
                  {Object.entries(secondaryBreakdown).map(([name, amt]) => (
                    <div key={name} className="flex justify-between">
                      <span>{name} items:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pb-2 border-b border-gray-200">
                    <span>Delivery Fee:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(deliveryFees)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold text-gray-800">Total to Collect:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {order.payment_method === 'cash_on_delivery' && step === 'dropoff' && (
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <QrCode size={16} /> Collect Payment
                  </h3>
                  <p className="text-xs text-blue-600/80 font-medium mt-1">Student must pay <strong>{formatCurrency(order.total_amount)}</strong></p>
                </div>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl active:scale-95 transition shadow-sm"
                >
                  {showQR ? 'Hide QR' : 'Show QR'}
                </button>
              </div>
              
              {showQR && (
                <div className="mt-4 pt-4 border-t border-blue-200/50 flex flex-col items-center">
                  <div className="bg-white p-3 rounded-2xl shadow-sm mb-3">
                    {order.shops?.qr_code_url ? (
                      <div className="w-48 h-48 relative rounded-xl overflow-hidden border border-gray-100">
                        {/* Use standard img tag for simplicity and reliability with external URLs */}
                        <img 
                          src={order.shops.qr_code_url} 
                          alt="Shop UPI QR Code" 
                          className="object-contain w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                        <QrCode size={48} className="text-gray-400 mb-2" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Scan to Pay</span>
                      </div>
                    )}
                  </div>
                  {order.shops?.upi_id && (
                    <p className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg mb-2">
                      {order.shops.upi_id}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-blue-600/80 uppercase tracking-wider text-center max-w-[200px]">
                    Ask student to scan with GPay / PhonePe
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
            <>
              <button 
                onClick={handleDeliveredClick} 
                className="w-full bg-[#16A34A] hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95 text-lg flex items-center justify-center gap-2 mb-3"
              >
                <CheckCircle2 size={24} /> Enter OTP to Deliver
              </button>
              <button 
                onClick={handleFailDelivery} 
                className="w-full bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 font-bold py-3 rounded-xl shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
              >
                <X size={16} /> Mark as Failed & Return to Shop
              </button>
            </>
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
