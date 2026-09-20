'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Minus, Trash2, CheckCircle2, Circle, Ticket, ChevronRight, MapPin, Search, Info } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { PaymentMethod, Shop } from '@/types'
import { getPromotionByCode, Promotion } from '@/lib/supabase/queries/promotions'
import { placeOrder, getStudentOrders } from '@/lib/supabase/queries/orders'
import { getShopById } from '@/lib/supabase/queries/shops'
import { updateCheckoutLocationServer } from './actions'

const TIP_OPTIONS = [0, 10, 20, 30]

export default function UnifiedCartPage() {
  const router = useRouter()
  const { user, studentProfile, setStudentProfile } = useAuthStore()
  const { 
    items, shopId, updateQuantity, clearCart, addItem,
    getTotalPrice, getDeliveryFee, getPlatformFee, getGrandTotal,
    deliveryTip, setDeliveryTip 
  } = useCartStore()

  const [shopInfo, setShopInfo] = useState<Shop | null>(null)
  const [minOrderAmount, setMinOrderAmount] = useState<number | null>(null)
  const [suggestedItems, setSuggestedItems] = useState<any[]>([])

  // Modal & Checkout State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [specialNote, setSpecialNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  
  // Location & Dine-In State
  const [dineInEnabled, setDineInEnabled] = useState(false)
  const [isDineIn, setIsDineIn] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [hostelName, setHostelName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isCustomAddress, setIsCustomAddress] = useState(false)

  // Promo State
  const [couponCode, setCouponCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null)
  const [couponError, setCouponError] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  // Active Order State
  const [hasActiveOrder, setHasActiveOrder] = useState(false)

  // Subtotals
  const subtotal = getTotalPrice()
  const discountAmount = appliedPromo ? (subtotal * appliedPromo.discount_percent) / 100 : 0
  const finalTotal = getGrandTotal() - discountAmount

  useEffect(() => {
    if (shopId) {
      fetchShopDetails(shopId)
      fetchSuggestedItems(shopId)
    }
  }, [shopId])

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient()
      const { data } = await supabase.from('app_settings').select('dine_in_enabled').limit(1).single()
      const { data: locData } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
      if (locData && locData.value) {
        try { setDeliveryLocations(JSON.parse(locData.value)) } catch(e) {}
      }
      if (data && shopInfo) setDineInEnabled(data.dine_in_enabled && shopInfo.dine_in_enabled)
    }
    if (shopInfo) loadSettings()
  }, [shopInfo])

  useEffect(() => {
    if (studentProfile) {
      const currentHostel = studentProfile.hostel_name || ''
      setHostelName(currentHostel)
      setRoomNumber(studentProfile.room_number || '')
      if (!currentHostel) setIsEditingLocation(true)
    }
  }, [studentProfile])

  useEffect(() => {
    if (deliveryLocations.length > 0 && studentProfile?.hostel_name) {
      setIsCustomAddress(!deliveryLocations.includes(studentProfile.hostel_name))
    }
  }, [deliveryLocations, studentProfile])

  useEffect(() => {
    if (!user) return
    async function checkActive() {
      try {
        const orders = await getStudentOrders(user!.id)
        const active = orders.some(o => ['pending', 'preparing', 'ready', 'assigned', 'out_for_delivery'].includes(o.status))
        setHasActiveOrder(active)
      } catch (e) {}
    }
    checkActive()
  }, [user])

  async function fetchShopDetails(currentShopId: string) {
    const data = await getShopById(currentShopId)
    if (data) {
      setShopInfo(data)
      setMinOrderAmount(data.min_order_amount ?? null)
    }
  }

  async function fetchSuggestedItems(currentShopId: string) {
    try {
      const supabase = createClient()
      const { data: collabs } = await supabase
        .from('shop_collaborations')
        .select('partner_shop_id, partner:partner_shop_id(name)')
        .eq('primary_shop_id', currentShopId)
        .eq('is_active', true)

      if (collabs && collabs.length > 0) {
        const partnerShop = collabs[0]
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('*')
          .eq('shop_id', partnerShop.partner_shop_id)
          .eq('is_available', true)
          .limit(10)
        
        if (menuItems) {
          setSuggestedItems(menuItems.map(m => ({ ...m, partnerShopName: (partnerShop.partner as any).name })))
        }
      } else {
        setSuggestedItems([])
      }
    } catch (err) {}
  }

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
    if (!hostelName.trim()) { toast.error('Please select your delivery location'); return }
    try {
      await updateCheckoutLocationServer(user!.id, hostelName.trim(), roomNumber.trim() || 'N/A')
      setStudentProfile({ ...studentProfile!, hostel_name: hostelName.trim(), room_number: roomNumber.trim() || 'N/A' })
      setIsEditingLocation(false)
      toast.success('Location updated!')
    } catch (e) {
      toast.error('Failed to update location')
    }
  }

  const handlePlaceOrder = async () => {
    if (!user || !shopId || hasActiveOrder) return
    if (!user.full_name || !user.phone || String(user.phone).trim() === '' || String(user.phone).trim() === 'null') {
      toast.error('Please complete your profile (Name and Phone) before placing an order.')
      router.push('/complete-profile')
      return
    }

    if (minOrderAmount && subtotal < minOrderAmount) {
      toast.error(`Minimum order amount for this shop is ₹${minOrderAmount}. Add ₹${(minOrderAmount - subtotal).toFixed(2)} more to checkout.`, { duration: 5000 })
      return
    }

    if (isDineIn) {
      if (!tableNumber.trim()) { toast.error('Please enter your table number'); return }
      if (items.some(i => i.partnerShopId)) { toast.error('Dine-In is not available for orders containing add-ons from partner shops.'); return }
    } else {
      if (shopInfo && !shopInfo.is_open) { toast.error('This shop is currently closed for delivery.'); return }
      if (!hostelName.trim()) { toast.error('Please select your delivery location'); setIsEditingLocation(true); return }
    }

    try {
      setIsPlacingOrder(true)
      const { orderId, orderNumber } = await placeOrder({
        studentId: user.id,
        shopId: shopId,
        cartItems: items,
        totalAmount: finalTotal,
        deliveryFee: isDineIn ? 0 : getDeliveryFee(),
        platformFee: getPlatformFee(),
        paymentMethod,
        hostelName: isDineIn ? `[Dine-In] Table: ${tableNumber.trim()}` : `${hostelName.trim()} ${roomNumber.trim() ? '- ' + roomNumber.trim() : ''}`.trim(),
        roomNumber: isDineIn ? 'N/A' : roomNumber.trim() || 'N/A',
        specialNote,
        orderType: isDineIn ? 'dine_in' : 'delivery',
      })

      try {
        const pushData = JSON.stringify({ shopId, orderNumber, totalAmount: formatCurrency(finalTotal) })
        navigator.sendBeacon('/api/orders/notify', new Blob([pushData], { type: 'application/json' }))
      } catch (e) {}

      clearCart()
      toast.success('Order placed! 🎉')
      router.replace(`/student/track/${orderId}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative overflow-hidden">
        <div className="bg-white px-5 pt-3 pb-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} className="text-gray-800" /></button>
          <h1 className="text-lg font-bold text-gray-900">Cart</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 mb-4 opacity-50 text-6xl">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6">Looks like you haven't added anything to your cart yet.</p>
          <button onClick={() => router.push('/student/home')} className="bg-[#E23744] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#c82f3a] transition-all">
            Browse Restaurants
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F1F1F6] pb-32 max-w-[430px] mx-auto font-sans relative">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} className="text-gray-900" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{shopInfo?.name || 'Your Cart'}</h1>
          <p className="text-xs text-gray-500 font-medium">Delivery in 25-30 mins</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Items Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {items.map((item, index) => (
            <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
              <div className="flex gap-3">
                <div className="mt-1">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center border-green-600`}>
                    <div className={`w-2 h-2 rounded-full bg-green-600`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-gray-900 leading-snug">{item.name}</p>
                  <p className="font-bold text-sm text-gray-700 mt-0.5">{formatCurrency(item.price)}</p>
                  {item.variantName && <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>}
                </div>
                
                <div className="w-24 h-9 bg-red-50 rounded-lg flex items-center justify-between px-2 border border-red-100 shrink-0">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantName)} className="p-1 text-[#E23744]">
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-sm text-[#E23744]">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantName)} className="p-1 text-[#E23744]">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <div 
            onClick={() => router.push(`/student/menu/${shopId}`)}
            className="p-4 border-t border-dashed border-gray-200 text-center cursor-pointer hover:bg-gray-50 transition"
          >
            <p className="text-sm font-bold text-[#E23744] flex items-center justify-center gap-1">
              <Plus size={16} /> Add more items
            </p>
          </div>
        </div>

        {/* Cooking Instructions */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 items-start">
          <div className="mt-0.5 opacity-60">✍️</div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Any restaurant requests? We will try our best to convey it"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              className="w-full text-[13px] text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
            />
          </div>
        </div>

        {/* Delivery Tip */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>💖</span>
            <div>
              <p className="font-bold text-[14px] text-gray-900">Tip your delivery partner</p>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">100% of the tip goes to the rider.</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {TIP_OPTIONS.map((amt) => (
              <button
                key={amt}
                onClick={() => setDeliveryTip(amt)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  deliveryTip === amt 
                    ? 'border-[#E23744] bg-red-50 text-[#E23744]' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {amt === 0 ? 'No Tip' : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Offers & Benefits */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h3 className="font-bold text-gray-900 text-[14px] px-4 pt-4 pb-2">Offers & Benefits</h3>
          
          <div className="p-4 border-t border-dashed border-gray-100 flex items-start gap-3">
            <Ticket size={24} className="text-blue-600 mt-1" />
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full font-bold text-sm text-gray-900 placeholder-gray-400 focus:outline-none uppercase"
                disabled={!!appliedPromo}
              />
              {couponError && <p className="text-red-500 text-[11px] font-bold mt-1">{couponError}</p>}
              {appliedPromo && <p className="text-green-600 text-[11px] font-bold mt-1">Applied: {appliedPromo.discount_percent}% OFF</p>}
            </div>
            {appliedPromo ? (
              <button onClick={() => { setAppliedPromo(null); setCouponCode('') }} className="text-sm font-bold text-red-500">Remove</button>
            ) : (
              <button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode} className="text-sm font-bold text-[#E23744] disabled:opacity-50">Apply</button>
            )}
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 text-[14px] mb-3">Bill Details</h3>
          
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px] text-gray-600">
              <span>Item Total</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-[13px] text-blue-600 font-medium">
                <span>Item Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px] text-gray-600">
              <span className="flex items-center gap-1 border-b border-dashed border-gray-300">Delivery partner fee <Info size={12}/></span>
              <span className="font-medium text-gray-900">{formatCurrency(getDeliveryFee())}</span>
            </div>
            {deliveryTip > 0 && (
              <div className="flex justify-between text-[13px] text-gray-600">
                <span>Delivery Tip</span>
                <span className="font-medium text-gray-900">{formatCurrency(deliveryTip)}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px] text-gray-600">
              <span className="flex items-center gap-1 border-b border-dashed border-gray-300">Platform fee <Info size={12}/></span>
              <span className="font-medium text-gray-900">{formatCurrency(getPlatformFee())}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-bold text-[15px] text-gray-900">To Pay</span>
            <span className="font-black text-[16px] text-gray-900">{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="p-3">
          <button 
            onClick={() => {
              if (hasActiveOrder) {
                toast.error('You have an active order. Wait for it to be delivered first.')
                return
              }
              if (minOrderAmount && subtotal < minOrderAmount) {
                toast.error(`Add ₹${(minOrderAmount - subtotal).toFixed(2)} more to reach minimum order.`)
                return
              }
              setIsModalOpen(true)
            }}
            className="w-full bg-[#E23744] hover:bg-[#c82f3a] text-white py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-between px-4 transition-colors shadow-sm"
          >
            <div className="flex flex-col items-start">
              <span className="text-[15px] leading-tight">{formatCurrency(finalTotal)}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-90">Total</span>
            </div>
            <div className="flex items-center gap-1">
              Select Address <ChevronRight size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* Slide-Up Modal for Checkout (Address + Payment) */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#F1F1F6] rounded-t-3xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-white p-4 pb-0 flex justify-center shrink-0">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3" />
              </div>
              <div className="bg-white px-5 pb-4 shrink-0 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900">Confirm Order</h2>
                <span className="font-bold text-[#E23744]">{formatCurrency(finalTotal)}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Dine-in vs Delivery Toggle */}
                {dineInEnabled && (
                  <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                    <button
                      onClick={() => setIsDineIn(false)}
                      className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${!isDineIn ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                      Delivery
                    </button>
                    <button
                      onClick={() => setIsDineIn(true)}
                      className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${isDineIn ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                      Dine-In
                    </button>
                  </div>
                )}

                {/* Address / Table Section */}
                {isDineIn ? (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">🍽️ Table Number</h4>
                    <input 
                      type="text" placeholder="e.g. 5" value={tableNumber} onChange={e => setTableNumber(e.target.value)} 
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-[#E23744]/20 focus:border-[#E23744] font-bold text-sm" 
                    />
                  </div>
                ) : isEditingLocation ? (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><MapPin size={16}/> Delivery Location</h4>
                      <button type="button" onClick={() => { setIsCustomAddress(!isCustomAddress); setHostelName(''); }} className="text-xs font-bold text-blue-600 hover:underline">
                        {isCustomAddress ? 'Choose Preset' : 'Enter Custom'}
                      </button>
                    </div>
                    
                    {isCustomAddress ? (
                      <input type="text" value={hostelName} placeholder="e.g. Block A" onChange={e => setHostelName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm mb-3" />
                    ) : (
                      <select value={hostelName} onChange={e => setHostelName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm mb-3">
                        <option value="" disabled>Select your location</option>
                        {deliveryLocations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                      </select>
                    )}
                    
                    <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="Room / Block (Optional)" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm mb-3" />
                    <button onClick={handleSaveLocation} className="w-full bg-black text-white font-bold py-3 rounded-xl text-sm">Save Address</button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
                    <div className="mt-1 bg-gray-100 p-2 rounded-full"><MapPin size={18} className="text-gray-700"/></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm mb-0.5">Delivering to</h4>
                      <p className="text-xs text-gray-500 font-medium truncate">
                        {studentProfile?.hostel_name ? `${studentProfile.hostel_name} ${studentProfile.room_number !== 'N/A' && studentProfile.room_number ? '- ' + studentProfile.room_number : ''}` : 'Not set'}
                      </p>
                    </div>
                    <button onClick={() => setIsEditingLocation(true)} className="text-[#E23744] text-xs font-bold uppercase tracking-wider mt-1">Change</button>
                  </div>
                )}

                {/* Payment Method */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-3">Pay Using</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 text-xl">💵</div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                        <p className="text-[11px] text-gray-500 font-medium">Cash or PhonePe at your door</p>
                      </div>
                    </div>
                    <CheckCircle2 size={24} className="text-[#E23744]" fill="#E23744" stroke="white" />
                  </div>
                </div>

              </div>

              {/* Modal Action Bar */}
              <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || isEditingLocation}
                  className="w-full bg-[#E23744] disabled:bg-gray-400 text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
