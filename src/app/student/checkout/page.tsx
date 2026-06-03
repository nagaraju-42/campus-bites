'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { placeOrder, getStudentOrders } from '@/lib/supabase/queries/orders'
import { formatCurrency } from '@/lib/utils'
import { PaymentMethod } from '@/types'
import toast from 'react-hot-toast'
import { getPromotionByCode, Promotion } from '@/lib/supabase/queries/promotions'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const specialNote = searchParams.get('note') ?? ''

  const { user, studentProfile } = useAuthStore()
  const { items, shopId, getDeliveryFee, getPlatformFee, getGrandTotal, clearCart } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [hasActiveOrder, setHasActiveOrder] = useState(false)
  const [isCheckingActive, setIsCheckingActive] = useState(true)

  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [fullAddress, setFullAddress] = useState('')

  useEffect(() => {
    if (studentProfile) {
      setFullAddress(studentProfile.hostel_name || '')
      if (!studentProfile.hostel_name) {
        setIsEditingLocation(true)
      }
    }
  }, [studentProfile])

  const [couponCode, setCouponCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null)
  const [couponError, setCouponError] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  const subtotal = getGrandTotal() - getDeliveryFee() - getPlatformFee()
  const discountAmount = appliedPromo ? (subtotal * appliedPromo.discount_percent) / 100 : 0
  const finalTotal = getGrandTotal() - discountAmount

  // Check for existing active orders
  useEffect(() => {
    if (!user) return
    async function checkActive() {
      try {
        const orders = await getStudentOrders(user!.id)
        const active = orders.some(o => ['pending', 'preparing', 'ready', 'assigned', 'out_for_delivery'].includes(o.status))
        setHasActiveOrder(active)
      } catch (e) {
        console.error(e)
      } finally {
        setIsCheckingActive(false)
      }
    }
    checkActive()
  }, [user])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)
    setCouponError('')
    try {
      const promo = await getPromotionByCode(couponCode)
      if (promo) {
        setAppliedPromo(promo)
        toast.success(`Coupon applied! ${promo.discount_percent}% OFF`)
      } else {
        setCouponError('Invalid or expired coupon code.')
        setAppliedPromo(null)
      }
    } catch (err) {
      setCouponError('Failed to verify coupon.')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!fullAddress.trim()) {
      toast.error('Please enter your full delivery address')
      return
    }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('student_profiles').update({
        hostel_name: fullAddress.trim(),
        college_name: 'Campus',
        room_number: 'N/A'
      }).eq('id', user?.id)
      
      setIsEditingLocation(false)
      toast.success('Location saved!')
      
      // Update local store so it reflects immediately
      const { setStudentProfile } = useAuthStore.getState()
      setStudentProfile({ ...studentProfile, hostel_name: fullAddress.trim() } as any)
      
    } catch (err) {
      toast.error('Failed to save location')
    }
  }

  const handlePlaceOrder = async () => {
    if (!user || !shopId || hasActiveOrder) return
    if (!fullAddress.trim()) {
      toast.error('Please enter your full delivery address')
      setIsEditingLocation(true)
      return
    }
    setIsPlacingOrder(true)
    try {
      const { orderId } = await placeOrder({
        studentId: user.id,
        shopId,
        cartItems: items,
        totalAmount: finalTotal,
        deliveryFee: getDeliveryFee(),
        platformFee: getPlatformFee(),
        paymentMethod,
        hostelName: fullAddress.trim(),
        roomNumber: 'N/A',
        specialNote,
      })
      clearCart()
      toast.success('Order placed! 🎉')
      router.replace(`/student/track/${orderId}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-[#0F766E] px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 text-white">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-display font-bold flex-1">Checkout</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        
        {/* Active Order Warning */}
        {hasActiveOrder && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-4 text-orange-800 text-sm font-medium flex items-center gap-3 shadow-sm">
            <span className="text-2xl">⚠️</span>
            <p>You already have an active order. Please wait until it is delivered before placing a new one.</p>
          </div>
        )}

        {/* Delivery Address */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Delivery Location (Required)</h3>
          
          {isEditingLocation ? (
            <div className="bg-amber-50 rounded-3xl p-5 shadow-sm border border-amber-200 space-y-4">
              <div className="flex items-center gap-2 mb-2 text-amber-800">
                <span className="text-xl">📍</span>
                <p className="text-sm font-bold">Provide exact details for faster delivery</p>
              </div>
              
              <div>
                <label className="text-xs font-bold text-amber-800 mb-1 block">Full Delivery Address *</label>
                <textarea 
                  value={fullAddress} 
                  onChange={e => setFullAddress(e.target.value)} 
                  placeholder="e.g. Anurag University, Boys Hostel, Block B, 3rd Floor, Room 312" 
                  className="w-full px-4 py-3 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-amber-400 font-bold text-sm h-28 resize-none" 
                />
              </div>
              <button onClick={handleSaveLocation} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95 text-sm">
                Save Location
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#0F766E]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0F766E]/5 rounded-full blur-xl"></div>
              <div className="flex items-start justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 shrink-0">📍</div>
                  <h4 className="font-bold text-gray-900">Delivery Address</h4>
                </div>
                <button onClick={() => setIsEditingLocation(true)} className="text-[#0F766E] hover:text-white bg-teal-50 hover:bg-[#0F766E] text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm border border-teal-100">
                  Edit Address
                </button>
              </div>
              <p className="text-gray-700 text-sm font-medium pl-10 relative z-10 leading-relaxed whitespace-pre-line">
                {studentProfile?.hostel_name || fullAddress}
              </p>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Payment Method</h3>
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 space-y-1">
            <PaymentOption
              label="UPI"
              description="Google Pay, PhonePe, Paytm"
              isSelected={paymentMethod === 'UPI'}
              onClick={() => setPaymentMethod('UPI')}
            />
            <PaymentOption
              label="Cash on Delivery"
              description=""
              isSelected={paymentMethod === 'cash_on_delivery'}
              onClick={() => setPaymentMethod('cash_on_delivery')}
            />
          </div>
        </div>

        {/* Promo Code */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Apply Coupon</h3>
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex gap-2 items-start">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                disabled={!!appliedPromo || hasActiveOrder}
              />
              {couponError && <p className="text-red-500 text-xs font-medium mt-1 ml-2">{couponError}</p>}
            </div>
            {appliedPromo ? (
              <button
                onClick={() => {
                  setAppliedPromo(null)
                  setCouponCode('')
                }}
                className="bg-red-50 text-red-600 font-bold px-4 py-3 rounded-xl text-sm transition hover:bg-red-100"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponCode || hasActiveOrder}
                className="bg-[#0F766E] text-white font-bold px-5 py-3 rounded-xl text-sm shadow-md shadow-teal-200 transition active:scale-95 disabled:opacity-50"
              >
                {isApplyingCoupon ? '...' : 'Apply'}
              </button>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Order Summary</h3>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Item Total</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-sm font-bold text-green-600">
                <span>Coupon ({appliedPromo.code})</span><span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Delivery Fee</span><span>{formatCurrency(getDeliveryFee())}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Platform Fee</span><span>{formatCurrency(getPlatformFee())}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-3 mt-1">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total Amount</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-30">
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || hasActiveOrder || isCheckingActive}
          className={`w-full text-white py-4 rounded-2xl font-bold text-base shadow-xl flex justify-center transition active:scale-95 ${
            hasActiveOrder || isCheckingActive 
            ? 'bg-gray-400 cursor-not-allowed shadow-none' 
            : 'bg-[#0F766E] shadow-teal-200 hover:bg-teal-800'
          }`}
        >
          {isCheckingActive ? 'Checking...' : isPlacingOrder ? 'Processing...' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}

function PaymentOption({ label, description, isSelected, onClick }: {
  label: string; description: string;
  isSelected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        {isSelected ? (
          <CheckCircle2 size={20} className="text-[#0F766E]" fill="currentColor" stroke="white" />
        ) : (
          <Circle size={20} className="text-gray-300" />
        )}
        <div>
          <p className="font-bold text-gray-900 text-sm">{label}</p>
          {description && <p className="text-gray-400 text-xs font-medium">{description}</p>}
        </div>
      </div>
    </button>
  )
}
