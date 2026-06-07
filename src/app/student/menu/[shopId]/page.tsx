'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, Clock, Plus, Minus, ShoppingCart, Info, Search, ChevronDown } from 'lucide-react'
import { getShopById, getPrimaryShopsForPartner } from '@/lib/supabase/queries/shops'
import { getMenuItemsByShop, groupMenuByCategory, getCollaborativeMenuItems } from '@/lib/supabase/queries/menu'
import { Shop, MenuItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import ShopReviews from '@/components/shop/ShopReviews'

export default function MenuPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Menu')
  const [partnerShops, setPartnerShops] = useState<any[]>([])
  const [primaryShops, setPrimaryShops] = useState<any[]>([])
  const [ownerDetails, setOwnerDetails] = useState<any>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedVariantItem, setSelectedVariantItem] = useState<MenuItem | null>(null)

  const { items, addItem, updateQuantity, getTotalItems, getTotalPrice, shopId: cartShopId } = useCartStore()

  const searchParams = useSearchParams()
  const orderMode = searchParams.get('mode') || 'delivery'
  const isShopAccessible = shop ? (shop.is_open || (orderMode === 'dine_in' && shop.dine_in_enabled)) : true

  const getItemQuantity = (itemId: string) =>
    items.filter((i) => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    async function load() {
      try {
        const [shopData, menuData, primaryData] = await Promise.all([
          getShopById(shopId),
          getCollaborativeMenuItems(shopId),
          getPrimaryShopsForPartner(shopId)
        ])
        setShop(shopData)
        setGroupedMenu(groupMenuByCategory(menuData.items))
        setPartnerShops(menuData.partnerShops)
        setPrimaryShops(primaryData)

        if (shopData?.owner_id) {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: owner } = await supabase.from('profiles').select('full_name, phone, email').eq('id', shopData.owner_id).single()
          if (owner) setOwnerDetails(owner)
        }

      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shopId])

  useEffect(() => {
    if (activeTab !== 'Menu' || showSearch) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.id.replace('category-', '')
          setActiveCategory(categoryId)
        }
      })
    }, { rootMargin: '-120px 0px -60% 0px' })

    Object.keys(groupedMenu).forEach(cat => {
      const el = document.getElementById(`category-${cat}`)
      if (el) observer.observe(el)
    })

    if (!activeCategory && Object.keys(groupedMenu).length > 0) {
      setActiveCategory(Object.keys(groupedMenu)[0])
    }

    return () => observer.disconnect()
  }, [groupedMenu, activeTab, showSearch])

  const handleAddToCart = (item: MenuItem, variantName?: string, variantPrice?: number) => {
    if (!isShopAccessible) {
      toast.error(`This shop is currently closed for ${orderMode === 'dine_in' ? 'dine-in' : 'delivery'}.`)
      return
    }

    if (item.variants && item.variants.length > 0 && !variantName) {
      setSelectedVariantItem(item)
      return
    }

    if (primaryShops.length > 0) {
      const allowedPrimaryIds = primaryShops.map(p => p.primary_shop_id)
      const hasPrimaryCart = cartShopId && allowedPrimaryIds.includes(cartShopId)
      const hasPrimaryItem = items.some(i => i.shopId === cartShopId && !i.partnerShopId)

      if (!hasPrimaryCart || !hasPrimaryItem) {
        const primaryShopName = primaryShops[0]?.shops?.name || 'the primary shop'
        toast.error((t) => (
          <div className="flex flex-col gap-2">
            <p className="font-bold text-sm">Add-on Item Only!</p>
            <p className="text-xs text-gray-700">
              {shop?.name} is a partner of {primaryShopName}. You must add at least one item from {primaryShopName} first!
            </p>
            <button 
              onClick={() => {
                toast.dismiss(t.id)
                router.push(`/student/menu/${primaryShops[0].primary_shop_id}`)
              }}
              className="mt-1 bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg w-fit"
            >
              Go to {primaryShopName}
            </button>
          </div>
        ), { duration: 5000 })
        return
      }
    }

    if (cartShopId && cartShopId !== shopId) {
      toast((t) => (
        <div>
          <p className="font-bold text-sm">Your cart has items from another shop</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Do you want to clear it and start fresh?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { 
                addItem({ 
                  id: item.id, 
                  shopId: shopId, 
                  partnerShopId: item.shop_id !== shopId ? item.shop_id : undefined,
                  shopName: shop?.name ?? '', 
                  name: variantName ? `${item.name} (${variantName})` : item.name, 
                  price: variantPrice ?? item.price, 
                  quantity: 1, 
                  image_url: item.image_url ?? undefined,
                  variantName: variantName
                }); 
                toast.dismiss(t.id) 
              }}
              className="bg-[#DC2626] text-white font-bold text-xs px-3 py-1.5 rounded-lg"
            >Yes, Start Fresh</button>
            <button onClick={() => toast.dismiss(t.id)} className="border border-gray-200 text-gray-600 font-bold text-xs px-3 py-1.5 rounded-lg">Cancel</button>
          </div>
        </div>
      ), { duration: 6000 })
      return
    }

    addItem({ 
      id: item.id, 
      shopId: shopId, 
      partnerShopId: item.shop_id !== shopId ? item.shop_id : undefined,
      shopName: shop?.name ?? '', 
      name: variantName ? `${item.name} (${variantName})` : item.name, 
      price: variantPrice ?? item.price, 
      quantity: 1, 
      image_url: item.image_url ?? undefined,
      variantName: variantName
    })
  }

  if (isLoading) return <MenuSkeleton />

  return (
    <div className="min-h-screen bg-gray-50 pb-32 max-w-[430px] mx-auto relative">
      
      {/* Dynamic Header Image + Top Bar */}
      <div className="relative h-64 bg-[#7F1D1D] rounded-b-3xl overflow-hidden">
        {/* Dynamic cover image layer */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <Image 
          src={shop?.cover_image || "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
          alt={`${shop?.name || 'Shop'} Cover`} 
          fill 
          className="object-cover" 
          priority 
        />
        
        {/* Top Nav inside image */}
        <div className="absolute top-0 left-0 w-full px-5 pt-12 pb-4 z-20 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-white p-1 bg-black/20 rounded-full backdrop-blur-sm">
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-3">
            <button onClick={() => { setShowSearch(!showSearch); if(showSearch) setSearchQuery('') }} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <Search size={18} />
            </button>
            <button onClick={() => setActiveTab('Info')} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <Info size={18} />
            </button>
          </div>
        </div>
        
        {showSearch && (
          <div className="absolute top-16 left-0 w-full px-5 z-20">
            <input 
              autoFocus
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 px-4 py-2.5 rounded-xl shadow-lg focus:outline-none"
            />
          </div>
        )}

        {/* Shop Info inside image */}
        <div className="absolute bottom-6 left-5 z-20 flex gap-4 items-end">
          <div className="relative w-[72px] h-[72px] rounded-2xl bg-white shadow-lg border-2 border-white overflow-hidden flex-shrink-0">
            {shop?.logo_url ? (
              <Image src={shop.logo_url} alt="Logo" fill className="object-cover" sizes="72px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-3xl">🏪</div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-1 drop-shadow-md">{shop?.name}</h1>
            {partnerShops && partnerShops.length > 0 && (
              <p className="text-xs text-white/90 mb-1 font-medium bg-black/40 inline-block px-2 py-1 rounded backdrop-blur-sm">
                🤝 Partnered with {partnerShops.map(p => p.name).join(', ')}
              </p>
            )}
            {primaryShops && primaryShops.length > 0 && (
              <p className="text-xs text-white mb-1 font-bold bg-blue-600/90 inline-block px-2 py-1 rounded backdrop-blur-sm border border-blue-400">
                🤝 Partner Shop of {primaryShops.map(p => p.shops?.name).filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex items-center gap-2 text-white/90 text-xs font-medium mb-1 mt-1 drop-shadow-sm">
              <Star size={12} className="text-[#EAB308]" fill="currentColor" />
              <span className="font-bold">4.6 (230+)</span>
              <span>•</span>
              <span>30 mins</span>
              <span>•</span>
              <span>₹40 min</span>
            </div>
            <p className="text-white/80 text-xs drop-shadow-sm max-w-[200px] line-clamp-1">{shop?.description}</p>
          </div>
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

      {!isShopAccessible && (
        <div className="bg-red-500 text-white text-center text-xs font-bold py-2 sticky top-0 z-20 shadow-md">
          Shop is currently closed for {orderMode === 'delivery' ? 'delivery' : 'dine-in'}. Browsing only.
        </div>
      )}

      <div className={`px-5 py-4 flex gap-8 border-b border-gray-200 sticky ${!isShopAccessible ? 'top-8' : 'top-0'} bg-gray-50 z-10`}>
        {['Menu', 'Reviews', 'Info'].map((tab) => (
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

      {activeTab === 'Reviews' && (
        <ShopReviews shopId={shopId} shopName={shop?.name || ''} />
      )}

      {activeTab === 'Info' && (
        <div className="px-5 py-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={18} className="text-[#DC2626]"/> Shop Information
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm text-gray-900 font-medium">{shop?.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Operating Hours</p>
                <p className="text-sm text-gray-900 font-medium">{shop?.opening_time || '9:00 AM'} - {shop?.closing_time || '10:00 PM'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-gray-900 leading-relaxed">{shop?.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>

          {ownerDetails && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star size={18} className="text-[#DC2626]"/> Owner Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Name</p>
                  <p className="text-sm text-gray-900 font-medium">{ownerDetails.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm text-gray-900 font-medium">{ownerDetails.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-gray-900 font-medium">{ownerDetails.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Menu' && (
        <>
          {/* Horizontal Categories Strip (Blinkit Style) */}
      <div className="px-4 py-3 sticky top-[4.5rem] bg-gray-50/95 backdrop-blur-md z-30 border-b border-gray-200 overflow-x-auto hide-scrollbar flex gap-2 snap-x">
        {Object.keys(groupedMenu).map((cat) => (
          <button 
            key={cat} 
            onClick={() => {
              const el = document.getElementById(`category-${cat}`);
              if (el) {
                const yOffset = -120; // offset for sticky headers
                const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                window.scrollTo({top: y, behavior: 'smooth'});
              }
            }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-xs transition snap-start border ${
              cat === activeCategory 
              ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-md shadow-red-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 shadow-sm'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Layout Menu Items (Blinkit Style) */}
      <div className="px-4 py-4 space-y-6">
        {Object.entries(groupedMenu).map(([category, menuItems]) => {
          const filteredItems = menuItems
            .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
              if (a.is_available === b.is_available) return 0;
              return a.is_available ? -1 : 1;
            })
          if (filteredItems.length === 0) return null
          
          return (
            <div key={category} id={`category-${category}`} className="pt-2">
              <h2 className="font-bold text-lg text-gray-900 mb-4">{category}</h2>
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const qty = getItemQuantity(item.id)
                return (
                  <div key={item.id} className={`bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}>
                    {/* Top: Large Square Image */}
                    <div className="w-full aspect-square rounded-xl overflow-hidden relative bg-gray-50 mb-2 flex items-center justify-center">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="160px" />
                      ) : (
                        <span className="text-4xl">🍲</span>
                      )}
                      {!item.is_available ? (
                        <div className="absolute bottom-2 left-2 right-2 bg-red-500/90 text-white text-[9px] font-bold px-2 py-1 rounded text-center backdrop-blur-sm uppercase">
                          Sold Out
                        </div>
                      ) : !isShopAccessible && (
                        <div className="absolute bottom-2 left-2 right-2 bg-gray-900/80 text-white text-[9px] font-bold px-2 py-1 rounded text-center backdrop-blur-sm uppercase">
                          Closed
                        </div>
                      )}
                    </div>

                    {/* Middle: Title & Price */}
                    <div className="flex-1 px-1">
                      <h3 className="font-bold text-gray-900 text-xs line-clamp-2 leading-snug h-8">
                        {item.name}
                      </h3>
                      {(item as any).partner_shop_name && (
                        <p className="text-[9px] font-bold text-purple-600 bg-purple-50 inline-block px-1.5 py-0.5 rounded mt-1">
                          by {(item as any).partner_shop_name}
                        </p>
                      )}
                      
                      {item.variants && item.variants.length > 0 ? (
                        <div className="mt-1">
                          <button 
                            onClick={() => setSelectedVariantItem(item)}
                            className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                          >
                            {item.variants[0].name} <ChevronDown size={10} />
                          </button>
                          <p className="text-gray-900 font-bold text-sm mt-1">{formatCurrency(item.variants[0].price)}</p>
                        </div>
                      ) : (
                        <p className="text-gray-900 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                      )}
                    </div>

                    {/* Bottom: Blinkit-style prominent ADD button */}
                    <div className="mt-3 px-1 pb-1">
                      {(!item.is_available || !isShopAccessible) ? (
                        <div className="w-full h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs">
                          UNAVAILABLE
                        </div>
                      ) : qty === 0 ? (
                        <button
                          onClick={() => {
                            if (item.variants && item.variants.length > 0) {
                              setSelectedVariantItem(item)
                            } else {
                              handleAddToCart(item)
                            }
                          }}
                          className="w-full h-8 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center justify-center shadow-sm font-bold text-xs uppercase tracking-wider hover:bg-green-100 transition active:scale-95"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="w-full h-8 flex items-center justify-between bg-[#16A34A] rounded-lg shadow-sm px-1 shadow-green-200">
                          <button onClick={() => {
                            if (item.variants && item.variants.length > 0) {
                              setSelectedVariantItem(item)
                            } else {
                              updateQuantity(item.id, qty - 1)
                            }
                          }} className="w-8 h-full flex items-center justify-center active:bg-green-700 rounded-l-md transition">
                            <Minus size={14} className="text-white" />
                          </button>
                          <span className="text-white font-bold text-sm flex-1 text-center">{qty}</span>
                          <button onClick={() => handleAddToCart(item)} className="w-8 h-full flex items-center justify-center active:bg-green-700 rounded-r-md transition">
                            <Plus size={14} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      </div>
      </>
      )}

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

      {/* Variant Selection Bottom Sheet */}
      <AnimatePresence>
        {selectedVariantItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedVariantItem(null)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[60] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedVariantItem.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">Select quantity/size</p>
                </div>
                <button onClick={() => setSelectedVariantItem(null)} className="p-2 bg-gray-200/50 rounded-full text-gray-500 hover:bg-gray-200">
                  <ArrowLeft size={18} className="rotate-[-90deg]" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex overflow-x-auto hide-scrollbar gap-3 snap-x">
                  {selectedVariantItem.variants?.map((variant, idx) => {
                    const cartItem = items.find(i => i.id === selectedVariantItem.id && i.variantName === variant.name)
                    const vQty = cartItem?.quantity || 0
                    const isVariantSoldOut = variant.is_available === false

                    return (
                      <div key={idx} className={`snap-start min-w-[140px] flex flex-col p-3 border rounded-2xl shadow-sm bg-white ${isVariantSoldOut ? 'opacity-60 grayscale border-gray-100' : 'border-green-100'}`}>
                        <div className="mb-3">
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{variant.name}</p>
                          <p className="text-sm font-bold text-gray-600 mt-0.5">{formatCurrency(variant.price)}</p>
                        </div>
                        
                        <div className="w-full h-9 mt-auto">
                          {isVariantSoldOut ? (
                            <div className="w-full h-full bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                              SOLD OUT
                            </div>
                          ) : vQty === 0 ? (
                            <button
                              onClick={() => handleAddToCart(selectedVariantItem, variant.name, variant.price)}
                              className="w-full h-full bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center justify-center font-bold text-xs uppercase hover:bg-green-100 transition"
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-between bg-[#16A34A] rounded-xl shadow-sm px-1 shadow-green-200">
                              <button onClick={() => updateQuantity(selectedVariantItem.id, vQty - 1, variant.name)} className="w-8 h-full flex items-center justify-center active:bg-green-700 rounded-l-md transition">
                                <Minus size={14} className="text-white" />
                              </button>
                              <span className="text-white font-bold text-sm flex-1 text-center">{vQty}</span>
                              <button onClick={() => handleAddToCart(selectedVariantItem, variant.name, variant.price)} className="w-8 h-full flex items-center justify-center active:bg-green-700 rounded-r-md transition">
                                <Plus size={14} className="text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
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
