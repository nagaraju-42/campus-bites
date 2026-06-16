'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function CartPage() {
  const router = useRouter()
  const [specialNote, setSpecialNote] = useState('')
  const [suggestedItems, setSuggestedItems] = useState<any[]>([])
  const { items, updateQuantity, clearCart, addItem, shopId,
    getTotalItems, getTotalPrice, getDeliveryFee, getPlatformFee, getGrandTotal } = useCartStore()

  useEffect(() => {
    if (shopId) {
      fetchSuggestedItems(shopId)
    }
  }, [shopId])

  async function fetchSuggestedItems(currentShopId: string) {
    try {
      const supabase = createClient()
      const { data: collabs } = await supabase
        .from('shop_collaborations')
        .select('partner_shop_id, partner:partner_shop_id(name)')
        .eq('primary_shop_id', currentShopId)
        .eq('is_active', true)

      if (collabs && collabs.length > 0) {
        // Just fetch items from the first active partner shop for simplicity
        const partnerShop = collabs[0]
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('*')
          .eq('shop_id', partnerShop.partner_shop_id)
          .eq('is_available', true)
          .limit(10)
        
        if (menuItems) {
          setSuggestedItems(menuItems.map(item => ({
            ...item,
            partnerShopName: (partnerShop.partner as any)?.name || (partnerShop.partner as any)?.[0]?.name || 'Partner Shop'
          })))
        }
      } else {
        setSuggestedItems([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCheckout = () => {
    // Check if ALL items are partner items
    const allPartnerItems = items.every(item => item.partnerShopId)
    if (allPartnerItems) {
      toast.error('You must add at least one item from the main shop before checking out.')
      return
    }
    router.push(`/student/checkout?note=${encodeURIComponent(specialNote)}`)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative overflow-hidden">
        {/* Dynamic Header */}
        <div className="bg-orange-500 px-5 pt-3 pb-6 rounded-b-3xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 text-white relative z-10">
            <button onClick={() => router.back()} className="p-1 bg-black/10 rounded-full"><ArrowLeft size={22} /></button>
            <h1 className="text-xl font-display font-bold flex-1">My Cart</h1>
          </div>
        </div>

        {/* Empty State Dashboard */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-10">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-orange-900/5 border border-orange-50 flex flex-col items-center text-center w-full relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl"></div>
            
            <div className="w-24 h-24 bg-gradient-to-tr from-orange-100 to-amber-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative z-10">
              <span className="text-5xl drop-shadow-md">🛒</span>
            </div>
            
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2 relative z-10">Good food is waiting</h2>
            <p className="text-gray-500 text-sm mb-8 relative z-10 leading-relaxed">
              Your cart is empty. Add items from your favorite shops and enjoy lightning-fast delivery!
            </p>
            
            <button
              onClick={() => router.push('/student/home')}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 relative z-10"
            >
              Browse Shops
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-orange-500 px-5 pt-3 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 text-white">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-display font-bold flex-1">My Cart</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Cart Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-3 px-4 py-4 ${
                  index < items.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover img-cinematic" sizes="64px" />
                  ) : (
                    <span className="text-2xl">🍲</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                </div>
                
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    {item.quantity === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-500" />}
                  </button>
                  <span className="text-gray-900 font-bold text-xs w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Plus size={14} className="text-gray-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Special Note */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2 pl-1">Add a note for restaurant</p>
          <input
            type="text"
            placeholder="Eg. No onions, less spicy..."
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            className="w-full bg-white text-sm text-gray-900 placeholder-gray-400 outline-none px-4 py-4 rounded-2xl shadow-sm border border-gray-100 font-medium"
          />
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Bill Details</h3>
          <BillRow label="Item Total" value={formatCurrency(getTotalPrice())} />
          <BillRow label="Delivery Fee" value={formatCurrency(getDeliveryFee())} />
          <BillRow label="Platform Fee" value={formatCurrency(getPlatformFee())} />
          <div className="border-t border-dashed border-gray-200 pt-3 mt-3">
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total Amount</span>
              <span>{formatCurrency(getGrandTotal())}</span>
            </div>
          </div>
        </div>
      </div>

      {suggestedItems.length > 0 && (
        <div className="px-5 pb-6">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            ✨ Suggested from {suggestedItems[0].partnerShopName}
          </h3>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {suggestedItems.map(item => (
              <div key={item.id} className="min-w-[140px] bg-white p-2 rounded-2xl shadow-sm border border-gray-100 snap-start flex flex-col justify-between">
                <div>
                  <div className="w-full aspect-square bg-gray-50 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover img-cinematic" sizes="140px" />
                    ) : (
                      <span className="text-4xl">🍰</span>
                    )}
                  </div>
                  <div className="px-1">
                    <p className="font-bold text-gray-900 text-xs line-clamp-2 leading-snug">{item.name}</p>
                    <p className="font-bold text-gray-900 text-sm mt-1">{formatCurrency(item.price)}</p>
                  </div>
                </div>
                <button
                  onClick={() => addItem({
                    id: item.id,
                    shopId: shopId!,
                    partnerShopId: item.shop_id,
                    shopName: suggestedItems[0].partnerShopName,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    image_url: item.image_url || undefined
                  })}
                  className="mt-3 w-full bg-green-50 text-green-700 border border-green-200 font-bold text-xs py-2 rounded-xl hover:bg-green-100 transition tracking-wider uppercase"
                >
                  ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proceed to Checkout */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-40">
        <button
          onClick={handleCheckout}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center shadow-xl shadow-orange-200 hover:bg-orange-600 transition active:scale-95"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  )
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs font-medium text-gray-500">
      <span>{label}</span>
      <span className="text-gray-900 font-bold">{value}</span>
    </div>
  )
}
