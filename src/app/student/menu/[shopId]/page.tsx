'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Clock, Plus, Minus, ShoppingCart, Info, Search } from 'lucide-react'
import { getShopById } from '@/lib/supabase/queries/shops'
import { getMenuItemsByShop, groupMenuByCategory } from '@/lib/supabase/queries/menu'
import { Shop, MenuItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function MenuPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Menu')

  const { items, addItem, updateQuantity, getTotalItems, getTotalPrice, shopId: cartShopId } = useCartStore()

  const getItemQuantity = (itemId: string) =>
    items.find((i) => i.id === itemId)?.quantity ?? 0

  useEffect(() => {
    async function load() {
      try {
        const [shopData, menuData] = await Promise.all([
          getShopById(shopId),
          getMenuItemsByShop(shopId),
        ])
        setShop(shopData)
        setGroupedMenu(groupMenuByCategory(menuData))
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shopId])

  const handleAddToCart = (item: MenuItem) => {
    if (cartShopId && cartShopId !== item.shop_id) {
      toast((t) => (
        <div>
          <p className="font-bold text-sm">Your cart has items from another shop</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Do you want to clear it and start fresh?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { addItem({ id: item.id, shopId: item.shop_id, shopName: shop?.name ?? '', name: item.name, price: item.price, quantity: 1, image_url: item.image_url ?? undefined }); toast.dismiss(t.id) }}
              className="bg-[#DC2626] text-white font-bold text-xs px-3 py-1.5 rounded-lg"
            >Yes, Start Fresh</button>
            <button onClick={() => toast.dismiss(t.id)} className="border border-gray-200 text-gray-600 font-bold text-xs px-3 py-1.5 rounded-lg">Cancel</button>
          </div>
        </div>
      ), { duration: 6000 })
      return
    }
    addItem({ id: item.id, shopId: item.shop_id, shopName: shop?.name ?? '', name: item.name, price: item.price, quantity: 1 })
  }

  if (isLoading) return <MenuSkeleton />

  return (
    <div className="min-h-screen bg-gray-50 pb-32 max-w-[430px] mx-auto relative">
      
      {/* Dynamic Header Image + Top Bar */}
      <div className="relative h-64 bg-[#7F1D1D] rounded-b-3xl overflow-hidden">
        {/* Placeholder image layer */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <Image src="https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Biryani Cover" fill className="object-cover" priority />
        
        {/* Top Nav inside image */}
        <div className="absolute top-0 left-0 w-full px-5 pt-12 pb-4 z-20 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-white p-1 bg-black/20 rounded-full backdrop-blur-sm">
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-3">
            <button className="text-white p-2 bg-black/20 rounded-full backdrop-blur-sm"><Search size={18} /></button>
            <button className="text-white p-2 bg-black/20 rounded-full backdrop-blur-sm"><Info size={18} /></button>
          </div>
        </div>

        {/* Shop Info inside image */}
        <div className="absolute bottom-6 left-5 z-20">
          <h1 className="text-3xl font-display font-bold text-white mb-1">{shop?.name}</h1>
          <div className="flex items-center gap-2 text-white/90 text-xs font-medium mb-1">
            <Star size={12} className="text-[#EAB308]" fill="currentColor" />
            <span className="font-bold">4.6 (230+)</span>
            <span>•</span>
            <span>30 mins</span>
            <span>•</span>
            <span>₹40 min</span>
          </div>
          <p className="text-white/70 text-xs">{shop?.description}</p>
        </div>
        
        {/* Open badge */}
        <div className="absolute bottom-6 right-5 z-20">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
            shop?.is_open ? 'bg-[#16A34A] text-white' : 'bg-red-500 text-white'
          }`}>
            {shop?.is_open ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 flex gap-8 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
        {['Menu', 'Reviews (230)', 'Info'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#DC2626] rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* Two Column Layout like image: Left sidebar categories, right items */}
      <div className="flex px-4 py-4 gap-4">
        
        {/* Left Categories Sidebar */}
        <div className="w-1/3 space-y-1 sticky top-16 self-start">
          <button className="w-full text-left px-3 py-3 rounded-xl bg-[#DC2626] text-white font-bold text-xs shadow-md">
            Bestsellers
          </button>
          {Object.keys(groupedMenu).map((cat) => (
            <button key={cat} className="w-full text-left px-3 py-3 rounded-xl bg-transparent text-gray-600 font-bold text-xs hover:bg-gray-100 transition">
              {cat}
            </button>
          ))}
        </div>

        {/* Right Menu Items */}
        <div className="w-2/3 space-y-4">
          {Object.entries(groupedMenu).map(([category, menuItems]) => (
            <div key={category} className="space-y-4">
              {menuItems.map((item) => {
                const qty = getItemQuantity(item.id)
                return (
                  <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-xs">{item.name}</h3>
                      <p className="text-gray-900 font-bold text-xs mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {item.image_url ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden relative">
                          <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🍲</div>
                      )}
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-7 h-7 bg-[#DC2626] rounded-md flex items-center justify-center shadow-sm relative -mt-5 z-10"
                        >
                          <Plus size={16} className="text-white" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-white rounded-md shadow-sm border border-gray-200 relative -mt-5 z-10 px-1 py-0.5">
                          <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-5 h-5 flex items-center justify-center">
                            <Minus size={12} className="text-[#DC2626]" />
                          </button>
                          <span className="text-gray-900 font-bold text-xs w-3 text-center">{qty}</span>
                          <button onClick={() => handleAddToCart(item)} className="w-5 h-5 flex items-center justify-center">
                            <Plus size={12} className="text-[#DC2626]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Cart Bottom Bar */}
      <AnimatePresence>
        {getTotalItems() > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px] z-40"
          >
            <button
              onClick={() => router.push('/student/cart')}
              className="w-full bg-[#DC2626] text-white px-5 py-4 rounded-2xl flex items-center justify-between shadow-xl shadow-red-200/50 hover:bg-red-700 transition"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <ShoppingCart size={18} />
                <span>{getTotalItems()} Item{getTotalItems() > 1 ? 's' : ''} | {formatCurrency(getTotalPrice())}</span>
              </div>
              <span className="text-sm font-bold bg-white text-[#DC2626] px-4 py-1.5 rounded-xl">View Cart</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="p-5 space-y-4 max-w-[430px] mx-auto">
      <div className="h-64 bg-gray-200 rounded-b-3xl animate-pulse -mx-5 -mt-5" />
      <div className="flex gap-4">
        <div className="w-1/3 h-40 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="w-2/3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
