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
import { getShopById } from '@/lib/supabase/queries/shops'
import { Shop } from '@/types'
import { updateCheckoutLocationServer } from './actions'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const specialNote = searchParams.get('note') ?? ''

  const { user, studentProfile } = useAuthStore()
  const { items, shopId, getDeliveryFee, getPlatformFee, getGrandTotal, clearCart } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [hasActiveOrder, setHasActiveOrder] = useState(false)
  const [isCheckingActive, setIsCheckingActive] = useState(true)

  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [hostelName, setHostelName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isCustomAddress, setIsCustomAddress] = useState(false)

  const [dineInEnabled, setDineInEnabled] = useState(false)
  const [isDineIn, setIsDineIn] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [shopInfo, setShopInfo] = useState<Shop | null>(null)

  useEffect(() => {
    async function loadSettings() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('app_settings').select('dine_in_enabled').limit(1).single()
      
      const { data: locData } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
      if (locData && locData.value) {
        try {
          setDeliveryLocations(JSON.parse(locData.value))
        } catch(e) {}
      }
      
      let shopData = null
      if (shopId) {
        shopData = await getShopById(shopId)
        setShopInfo(shopData)
        if (shopData && !shopData.is_open && shopData.dine_in_enabled) {
          setIsDineIn(true) // Force dine-in if closed for delivery
        }
      }

      if (data) setDineInEnabled(data.dine_in_enabled && (shopData ? shopData.dine_in_enabled : true))
    }
    loadSettings()
  }, [shopId])

  useEffect(() => {
    if (studentProfile) {
      const currentHostel = studentProfile.hostel_name || ''
      setHostelName(currentHostel)
      setRoomNumber(studentProfile.room_number || '')
      if (!currentHostel) {
        setIsEditingLocation(true)
      }
    }
  }, [studentProfile])

  useEffect(() => {
    if (deliveryLocations.length > 0 && studentProfile?.hostel_name) {
      setIsCustomAddress(!deliveryLocations.includes(studentProfile.hostel_name))
    }
  }, [deliveryLocations, studentProfile])

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
    if (!hostelName.trim()) {
      toast.error('Please select your delivery location')
      return
    }
    try {
      await updateCheckoutLocationServer(
        user!.id,
        hostelName.trim(),
        roomNumber.trim() || 'N/A'
      )
      
      useAuthStore.getState().setStudentProfile({ 
        ...studentProfile!, 
        hostel_name: hostelName.trim(),
        room_number: roomNumber.trim() || 'N/A'
      })
      
      setIsEditingLocation(false)
      toast.success('Location updated!')
    } catch (e) {
      toast.error('Failed to update location')
    }
  }

  const handlePlaceOrder = async () => {
    if (!user || !shopId || hasActiveOrder) return
    
    // Check if ALL items are partner items (user removed main shop items)
    const allPartnerItems = items.every(item => item.partnerShopId)
    if (allPartnerItems) {
      toast.error('You must add at least one item from the main shop to checkout.')
      return
    }

    if (isDineIn) {
      if (!tableNumber.trim()) {
        toast.error('Please enter your table number')
        return
      }
      if (items.some(i => i.partnerShopId)) {
        toast.error('Dine-In is not available for orders containing add-ons from partner shops.')
        return
      }
    } else {
      if (shopInfo && !shopInfo.is_open) {
        toast.error('This shop is currently closed for delivery.')
        return
      }
      if (!hostelName.trim()) {
        toast.error('Please select your delivery location')
        setIsEditingLocation(true)
        return
      }
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
        hostelName: isDineIn ? `[Dine-In] Table: ${tableNumber.trim()}` : `${hostelName.trim()} ${roomNumber.trim() ? '- ' + roomNumber.trim() : ''}`.trim(),
        roomNumber: 'N/A',
        specialNote,
        orderType: isDineIn ? 'dine_in' : 'delivery',
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

        {/* Order Mode & Location */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">Order Mode</h3>
          </div>
          
          {dineInEnabled && (
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4">
              <button
                onClick={() => {
                  if (shopInfo && !shopInfo.is_open) {
                    toast.error('Shop is closed for delivery.')
                    return
                  }
                  setIsDineIn(false)
                }}
                className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${!isDineIn ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:bg-gray-50'} ${shopInfo && !shopInfo.is_open ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Delivery
              </button>
              <button
                onClick={() => {
                  if (items.some(i => i.partnerShopId)) {
                    toast.error('Dine-In is not available for orders containing add-ons from partner shops.')
                    return
                  }
                  setIsDineIn(true)
                }}
                className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${isDineIn ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Dine-In
              </button>
            </div>
          )}

          {isDineIn ? (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#0F766E]/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 shrink-0">🍽️</div>
                <h4 className="font-bold text-gray-900">Table Number</h4>
              </div>
              <input 
                type="text" 
                placeholder="e.g. 5" 
                value={tableNumber} 
                onChange={e => setTableNumber(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none shadow-sm focus:ring-2 focus:ring-[#0F766E]/20 font-bold text-sm" 
              />
            </div>
          ) : isEditingLocation ? (
            <div className="bg-amber-50 rounded-3xl p-5 shadow-sm border border-amber-200 space-y-4">
              <div className="flex items-center gap-2 mb-2 text-amber-800">
                <span className="text-xl">📍</span>
                <p className="text-sm font-bold">Provide exact details for faster delivery</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-amber-800">
                    {isCustomAddress ? 'Custom Delivery Location *' : 'Preset Delivery Location *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAddress(!isCustomAddress)
                      setHostelName('')
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 underline transition"
                  >
                    {isCustomAddress ? 'Choose Preset' : 'Enter Custom'}
                  </button>
                </div>
                
                {isCustomAddress ? (
                  <input 
                    type="text"
                    value={hostelName} 
                    placeholder="e.g. My Custom Block"
                    onChange={e => setHostelName(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-amber-400 font-bold text-sm mb-3" 
                  />
                ) : (
                  <select 
                    value={hostelName} 
                    onChange={e => setHostelName(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-amber-400 font-bold text-sm mb-3" 
                  >
                    <option value="" disabled>Select your location</option>
                    {deliveryLocations.map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
                
                <label className="text-xs font-bold text-amber-800 mb-1 block">Room / Block Number (Optional)</label>
                <input 
                  type="text"
                  value={roomNumber} 
                  onChange={e => setRoomNumber(e.target.value)} 
                  placeholder="e.g. Room 312, Floor 3" 
                  className="w-full px-4 py-3 rounded-xl bg-white border-none shadow-sm focus:ring-2 focus:ring-amber-400 font-bold text-sm" 
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
                <button 
                  onClick={() => {
                    if (hasActiveOrder) {
                      toast.error('You cannot change address while you have an active order.')
                      return
                    }
                    setIsEditingLocation(true)
                  }} 
                  className={`text-[#0F766E] hover:text-white bg-teal-50 hover:bg-[#0F766E] text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm border border-teal-100 ${hasActiveOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Edit Address
                </button>
              </div>
              <p className="text-gray-700 text-sm font-medium pl-10 relative z-10 leading-relaxed whitespace-pre-line">
                {studentProfile?.hostel_name ? `${studentProfile.hostel_name} ${studentProfile.room_number !== 'N/A' && studentProfile.room_number ? '- ' + studentProfile.room_number : ''}` : 'Not set'}
              </p>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Payment Method</h3>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#0F766E]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0F766E]">
              <span className="text-xl">💵</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Pay on Delivery</p>
              <p className="text-xs text-gray-500 font-medium">Cash or PhonePe accepted at your door</p>
            </div>
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
          {isCheckingActive ? 'Checking...' : isPlacingOrder ? 'Processing...' : 'Place Order • Pay on Delivery (Cash/PhonePe)'}
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
