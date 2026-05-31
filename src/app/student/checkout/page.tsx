'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { placeOrder } from '@/lib/supabase/queries/orders'
import { formatCurrency } from '@/lib/utils'
import { PaymentMethod } from '@/types'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const specialNote = searchParams.get('note') ?? ''

  const { user, studentProfile } = useAuthStore()
  const { items, shopId, getDeliveryFee, getPlatformFee, getGrandTotal, clearCart } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const handlePlaceOrder = async () => {
    if (!user || !shopId) return
    setIsPlacingOrder(true)
    try {
      const { orderId } = await placeOrder({
        studentId: user.id,
        shopId,
        cartItems: items,
        totalAmount: getGrandTotal(),
        deliveryFee: getDeliveryFee(),
        platformFee: getPlatformFee(),
        paymentMethod,
        hostelName: studentProfile?.hostel_name ?? 'Unknown Hostel',
        roomNumber: studentProfile?.room_number ?? 'N/A',
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
        
        {/* Delivery Address */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Deliver to</h3>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-1">
              <p className="text-gray-900 font-bold">{studentProfile?.college_name || 'Anurag University'}</p>
              <button className="text-[#0F766E] text-xs font-bold">Change &gt;</button>
            </div>
            <p className="text-gray-600 text-sm font-medium">
              {studentProfile?.room_number && studentProfile?.hostel_name 
                ? `Room No. ${studentProfile.room_number}, ${studentProfile.hostel_name}` 
                : 'Hostel Details (Defaulting to Main Gate)'}
            </p>
            <p className="text-gray-400 text-xs mt-1">Jodimetla, Hyderabad</p>
          </div>
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

        {/* Order Summary */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Order Summary</h3>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Item Total</span><span>{formatCurrency(getGrandTotal() - getDeliveryFee() - getPlatformFee())}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Delivery Fee</span><span>{formatCurrency(getDeliveryFee())}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Platform Fee</span><span>{formatCurrency(getPlatformFee())}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-3 mt-1">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total Amount</span>
                <span>{formatCurrency(getGrandTotal())}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-30">
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder}
          className="w-full bg-[#0F766E] text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-teal-200 hover:bg-teal-800 transition active:scale-95 disabled:opacity-70 flex justify-center"
        >
          {isPlacingOrder ? 'Processing...' : 'Place Order'}
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
