'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, Plus, Minus, ShoppingCart, Info, Search, ChevronDown, Heart } from 'lucide-react'
import { getShopById, getPrimaryShopsForPartner } from '@/lib/supabase/queries/shops'
import { getMenuItemsByShop, groupMenuByCategory, getCollaborativeMenuItems } from '@/lib/supabase/queries/menu'
import { Shop, MenuItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import ShopReviews from '@/components/shop/ShopReviews'
import { useAuthStore } from '@/store/authStore'
import { useFavoritesStore } from '@/store/favoritesStore'
import { VerifiedBadgeIcon, HeartOutlineIcon, HeartFilledIcon } from '@/components/icons/CustomIcons'
import Link from 'next/link'

export default function MenuPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { favoriteShopIds, toggleFavorite } = useFavoritesStore()

  const [shop, setShop] = useState<Shop | null>(null)
  const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Menu')
  const [partnerShops, setPartnerShops] = useState<any[]>([])
  const [primaryShops, setPrimaryShops] = useState<any[]>([])
  const [ownerDetails, setOwnerDetails] = useState<any>(null)
  const [shopRating, setShopRating] = useState<string>('4.5')
  const [reviewCount, setReviewCount] = useState<number>(230)

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedVariantItem, setSelectedVariantItem] = useState<MenuItem | null>(null)

  const isFavorite = favoriteShopIds.includes(shopId)

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

        // Fetch real rating
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: reviews } = await supabase.from('shop_reviews').select('rating').eq('shop_id', shopId)
        if (reviews && reviews.length > 0) {
          const avg = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
          setShopRating(avg.toFixed(1))
          setReviewCount(reviews.length)
        }

        if (shopData?.owner_id) {
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
      toast.error(`This shop is currently closed.`)
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
        toast.error(`Add items from ${primaryShopName} first!`, { duration: 4000 })
        return
      }
    }
    if (cartShopId && cartShopId !== shopId) {
      toast((t) => (
        <div>
          <p className="font-bold text-sm">Cart has items from another shop</p>
          <p className="text-xs text-gray-500 mt-1">Clear cart and start fresh?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                addItem({
                  id: item.id, shopId, partnerShopId: item.shop_id !== shopId ? item.shop_id : undefined,
                  shopName: shop?.name ?? '', name: variantName ? `${item.name} (${variantName})` : item.name,
                  price: variantPrice ?? item.price, quantity: 1,
                  image_url: item.image_url ?? undefined, variantName
                })
                toast.dismiss(t.id)
              }}
              className="bg-[#EA580C] text-white font-bold text-xs px-3 py-1.5 rounded-lg"
            >Yes, Clear</button>
            <button onClick={() => toast.dismiss(t.id)} className="border border-gray-200 text-gray-600 font-bold text-xs px-3 py-1.5 rounded-lg">Cancel</button>
          </div>
        </div>
      ), { duration: 6000 })
      return
    }
    addItem({
      id: item.id, shopId, partnerShopId: item.shop_id !== shopId ? item.shop_id : undefined,
      shopName: shop?.name ?? '', name: variantName ? `${item.name} (${variantName})` : item.name,
      price: variantPrice ?? item.price, quantity: 1,
      image_url: item.image_url ?? undefined, variantName
    })
  }

  const handleFavoriteClick = () => {
    if (!user) { router.push('/student/login'); return }
    toggleFavorite(user.id, shopId)
  }

  if (isLoading) return <MenuSkeleton />

  const categories = Object.keys(groupedMenu)

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32 max-w-[430px] mx-auto relative font-sans">

      {/* ── Full-width banner image ── */}
      <div className="relative h-[220px] w-full overflow-hidden bg-gray-800">
        <Image
          src={shop?.cover_image || 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80'}
          alt={shop?.name || 'Shop'}
          fill
          className="object-cover img-banner"
          priority
        />
        {/* Gradient overlay - top for buttons, subtle darkening */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />

        {/* Top bar: back | search + heart */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-12 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md"
          >
            <ArrowLeft size={18} className="text-gray-900" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery('') }}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md"
            >
              <Search size={16} className="text-gray-900" />
            </button>
            <button
              onClick={handleFavoriteClick}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md"
            >
              {isFavorite
                ? <HeartFilledIcon className="w-[18px] h-[18px]" />
                : <HeartOutlineIcon className="w-[18px] h-[18px]" />
              }
            </button>
          </div>
        </div>

        {/* Search input overlay */}
        {showSearch && (
          <div className="absolute top-20 left-4 right-4 z-20">
            <input
              autoFocus
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl shadow-lg focus:outline-none text-sm"
            />
          </div>
        )}
      </div>

      {/* ── Shop Info Card (overlapping the banner) ── */}
      <div className="mx-3 -mt-6 bg-white rounded-2xl shadow-lg z-10 relative overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Shop thumbnail */}
            <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-gray-100 shrink-0 border-2 border-white shadow-md">
              {shop?.logo_url ? (
                <Image src={shop.logo_url} alt="Logo" fill className="object-cover img-cinematic" sizes="72px" />
              ) : shop?.cover_image ? (
                <Image src={shop.cover_image} alt="Logo" fill className="object-cover img-cinematic" sizes="72px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-50 text-3xl">🏪</div>
              )}
            </div>

            {/* Shop details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight">{shop?.name}</h1>
                {shop?.is_verified && <VerifiedBadgeIcon className="w-[18px] h-[18px] shrink-0" />}
                {/* OPEN badge */}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${isShopAccessible ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-red-100 text-red-600'}`}>
                  {isShopAccessible ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              {/* Partner tag */}
              {partnerShops && partnerShops.length > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                  <span className="text-base leading-none">🤝</span>
                  <span className="text-[11px] font-semibold text-orange-700">
                    Partnered with {partnerShops.map(p => p.name).join(', ')}
                  </span>
                </div>
              )}
              {primaryShops && primaryShops.length > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  <span className="text-base leading-none">🤝</span>
                  <span className="text-[11px] font-semibold text-blue-700">
                    Partner of {primaryShops.map(p => p.shops?.name).filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {/* Ratings + time + fee row */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span className="text-[13px] font-bold text-gray-900">{shopRating}</span>
                  <span className="text-[12px] text-gray-400">({reviewCount}+)</span>
                </div>
                <span className="text-gray-300 text-sm">•</span>
                <div className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-[12px] font-semibold text-gray-700">30 mins</span>
                </div>
                <span className="text-gray-300 text-sm">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-400">₹</span>
                  <span className="text-[12px] font-semibold text-gray-700">₹{shop?.delivery_fee || 40} min</span>
                </div>
              </div>

              {/* Categories */}
              <p className="text-[12px] text-gray-400 font-medium mt-1">
                {shop?.categories && shop.categories.length > 0
                  ? shop.categories.join(' • ')
                  : (shop?.description || 'Cafe • Fast Food • Beverages')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar: Menu | Reviews | Info ── */}
      <div className="bg-white mt-3 px-4 flex gap-6 border-b border-gray-100 sticky top-0 z-20">
        {[
          { label: 'Menu', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )},
          { label: 'Reviews', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          )},
          { label: 'Info', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          )},
        ].map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={`flex items-center gap-1.5 py-3.5 text-[13px] font-bold transition-all relative ${activeTab === label ? 'text-[#EA580C]' : 'text-gray-400'}`}
          >
            <span className={activeTab === label ? 'text-[#EA580C]' : 'text-gray-400'}>{icon}</span>
            {label}
            {activeTab === label && (
              <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#EA580C] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Reviews Tab ── */}
      {activeTab === 'Reviews' && (
        <ShopReviews shopId={shopId} shopName={shop?.name || ''} />
      )}

      {/* ── Info Tab ── */}
      {activeTab === 'Info' && (
        <div className="px-4 py-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 text-[15px]">Shop Information</h3>
            <div className="space-y-3">
              {shop?.address && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-sm text-gray-700 font-medium">{shop.address}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Hours</p>
                <p className="text-sm text-gray-700 font-medium">{shop?.opening_time || '9:00 AM'} – {shop?.closing_time || '10:00 PM'}</p>
              </div>
              {shop?.description && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">About</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{shop.description}</p>
                </div>
              )}
            </div>
          </div>
          {ownerDetails && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-[15px]">Owner Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Name</p>
                  <p className="text-sm text-gray-700 font-medium">{ownerDetails.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Phone</p>
                  <p className="text-sm text-gray-700 font-medium">{ownerDetails.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Menu Tab ── */}
      {activeTab === 'Menu' && (
        <>
          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none snap-x border-b border-gray-100">
              {categories.map((cat, i) => {
                // Map category to emoji - first cat gets fire
                const emojis = ['🔥', '🍽️', '🥤', '🍟', '🍰', '🥗']
                const emoji = emojis[i] || '🍴'
                const isActive = cat === activeCategory
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat)
                      const el = document.getElementById(`category-${cat}`)
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 160
                        window.scrollTo({ top: y, behavior: 'smooth' })
                      }
                    }}
                    className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[13px] transition-all snap-start border ${
                      isActive
                        ? 'bg-[#EA580C] border-[#EA580C] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{emoji}</span>
                    {cat}
                  </button>
                )
              })}
            </div>
          )}

          {/* Menu items grid – 2 columns exactly like reference */}
          <div className="px-3 py-4 space-y-6">
            {Object.entries(groupedMenu).map(([category, menuItems]) => {
              const filteredItems = menuItems
                .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => {
                  if (a.is_available === b.is_available) return 0
                  return a.is_available ? -1 : 1
                })
              if (filteredItems.length === 0) return null

              return (
                <div key={category} id={`category-${category}`}>
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[17px] font-extrabold text-gray-900">{category}</h2>
                    <button className="text-[#EA580C] text-[13px] font-bold flex items-center gap-0.5">
                      See all
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>

                  {/* 2-column grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {filteredItems.map((item) => {
                      const qty = getItemQuantity(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}
                        >
                          {/* Image with heart overlay */}
                          <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover img-cinematic"
                                sizes="(max-width: 430px) 50vw, 200px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                                <span className="text-5xl">🍲</span>
                              </div>
                            )}
                            {/* Heart button – top right */}
                            <button className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                            </button>
                            {/* Sold out overlay */}
                            {!item.is_available && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white font-bold text-xs bg-red-500 px-2 py-1 rounded-full uppercase">Sold Out</span>
                              </div>
                            )}
                          </div>

                          {/* Item info */}
                          <div className="p-2.5 flex flex-col flex-1">
                            <h3 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">
                              {item.name}
                            </h3>

                            {/* Partner shop tag (purple like reference) */}
                            {(item as any).partner_shop_name && (
                              <span className="mt-1 text-[10px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-1.5 py-0.5 rounded-full inline-block w-fit">
                                by {(item as any).partner_shop_name}
                              </span>
                            )}

                            {/* Price */}
                            {item.variants && item.variants.length > 0 ? (
                              <div className="mt-1">
                                <button
                                  onClick={() => setSelectedVariantItem(item)}
                                  className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                                >
                                  {item.variants[0].name} <ChevronDown size={10} />
                                </button>
                                <p className="text-gray-900 font-bold text-[14px] mt-1">{formatCurrency(item.variants[0].price)}</p>
                              </div>
                            ) : (
                              <p className="text-gray-900 font-bold text-[14px] mt-1">{formatCurrency(item.price)}</p>
                            )}

                            {/* ADD / +/- button exactly like reference */}
                            <div className="mt-2">
                              {(!item.is_available || !isShopAccessible) ? (
                                <div className="w-full h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-[11px]">
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
                                  className="w-full h-9 bg-white text-[#16A34A] border border-[#16A34A] rounded-full flex items-center justify-center gap-1.5 font-bold text-[13px] hover:bg-green-50 transition active:scale-95"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                  ADD
                                </button>
                              ) : (
                                <div className="w-full h-9 flex items-center justify-between bg-[#16A34A] rounded-full shadow-sm px-2">
                                  <button
                                    onClick={() => {
                                      if (item.variants && item.variants.length > 0) setSelectedVariantItem(item)
                                      else updateQuantity(item.id, qty - 1)
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-full active:bg-green-700 transition"
                                  >
                                    <Minus size={13} className="text-white" />
                                  </button>
                                  <span className="text-white font-bold text-sm">{qty}</span>
                                  <button
                                    onClick={() => handleAddToCart(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full active:bg-green-700 transition"
                                  >
                                    <Plus size={13} className="text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Offers banner at the bottom (like reference image) */}
            <div className="mt-2 bg-[#FEF3E8] rounded-2xl p-4 border border-orange-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-[#EA580C] rounded-xl flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="5" fill="#EA580C"/>
                    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="Inter, sans-serif">%</text>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-[13px] leading-tight">Order more, save more!</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Exciting offers & deals on your favourite shops 🎉</p>
                </div>
              </div>
              <Link href="/student/offers">
                <button className="bg-[#EA580C] text-white text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap hover:bg-orange-700 transition shrink-0">
                  View Offers
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── Floating Cart Bar ── */}
      <AnimatePresence>
        {getTotalItems() > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-40"
          >
            <button
              onClick={() => router.push('/student/cart')}
              className="w-full bg-[#EA580C] text-white px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-xl hover:bg-orange-700 transition"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{getTotalItems()}</span>
                </div>
                <ShoppingCart size={16} />
                <span>{getTotalItems()} Item{getTotalItems() > 1 ? 's' : ''} | {formatCurrency(getTotalPrice())}</span>
              </div>
              <span className="text-sm font-bold">View Cart →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Variant Bottom Sheet ── */}
      <AnimatePresence>
        {selectedVariantItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedVariantItem(null)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[60] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedVariantItem.name}</h3>
                  <p className="text-xs text-gray-400 font-medium">Select a size / variant</p>
                </div>
                <button onClick={() => setSelectedVariantItem(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm">✕</button>
              </div>
              <div className="p-4">
                <div className="flex overflow-x-auto gap-3 snap-x pb-2">
                  {selectedVariantItem.variants?.map((variant, idx) => {
                    const cartItem = items.find(i => i.id === selectedVariantItem.id && i.variantName === variant.name)
                    const vQty = cartItem?.quantity || 0
                    const isVariantSoldOut = variant.is_available === false
                    return (
                      <div key={idx} className={`snap-start min-w-[140px] flex flex-col p-3 border rounded-2xl bg-white ${isVariantSoldOut ? 'opacity-50 grayscale border-gray-100' : 'border-green-100'}`}>
                        <p className="font-bold text-gray-900 text-sm">{variant.name}</p>
                        <p className="text-sm font-bold text-gray-600 mt-0.5 mb-3">{formatCurrency(variant.price)}</p>
                        <div className="w-full h-9 mt-auto">
                          {isVariantSoldOut ? (
                            <div className="w-full h-full bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-xs">SOLD OUT</div>
                          ) : vQty === 0 ? (
                            <button
                              onClick={() => handleAddToCart(selectedVariantItem, variant.name, variant.price)}
                              className="w-full h-full bg-white text-[#16A34A] border border-[#16A34A] rounded-full flex items-center justify-center font-bold text-xs hover:bg-green-50 transition"
                            >ADD</button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-between bg-[#16A34A] rounded-full px-2">
                              <button onClick={() => updateQuantity(selectedVariantItem.id, vQty - 1, variant.name)} className="w-6 h-6 flex items-center justify-center rounded-full"><Minus size={12} className="text-white" /></button>
                              <span className="text-white font-bold text-sm">{vQty}</span>
                              <button onClick={() => handleAddToCart(selectedVariantItem, variant.name, variant.price)} className="w-6 h-6 flex items-center justify-center rounded-full"><Plus size={12} className="text-white" /></button>
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
    <div className="max-w-[430px] mx-auto">
      <div className="h-[220px] bg-gray-200 animate-pulse" />
      <div className="mx-3 -mt-6 bg-white rounded-2xl shadow-lg p-4">
        <div className="flex gap-3">
          <div className="w-[72px] h-[72px] bg-gray-200 rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
      <div className="px-3 mt-6 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-square bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-8 bg-gray-200 rounded-full animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
