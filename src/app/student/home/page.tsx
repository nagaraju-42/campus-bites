'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getApprovedShops } from '@/lib/supabase/queries/shops'
import { Shop } from '@/types'
import ShopCard from '@/components/student/ShopCard'
import { useAuthStore } from '@/store/authStore'
import { useFavoritesStore } from '@/store/favoritesStore'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { getActivePromotions } from '@/lib/supabase/queries/promotions'
import { Sheet, SheetContent, SheetClose, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, ClipboardList, User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SearchOverlay from '@/components/student/SearchOverlay'
import { useHomeDataStore } from '@/store/homeDataStore'
import {
  LogoIcon,
  HamburgerIcon,
  BellIcon,
  MapPinIcon,
  ChevronDownIcon,
  GPSIcon,
  SearchIcon,
  FilterIcon,
} from '@/components/icons/CustomIcons'

const DEFAULT_ALL_CATEGORY = {
  name: 'All',
  icon_url: 'https://unpkg.com/emoji-datasource-apple@15.0.1/img/apple/64/1f37d-fe0f.png'
}

export default function StudentHomePage() {
  const { user, studentProfile, setStudentProfile } = useAuthStore()
  const router = useRouter()
  const { fetchFavorites } = useFavoritesStore()

  // ── Persistent cache store ─────────────────────────────────────────────────
  const {
    shops: cachedShops,
    categories: cachedCategories,
    deliveryLocations: cachedLocations,
    isStale,
    setShops: storeSetShops,
    setCategories: storeSetCategories,
    setDeliveryLocations: storeSetLocations,
    markFetched,
  } = useHomeDataStore()

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [shops, setShops] = useState<Shop[]>(cachedShops)
  const [filteredShops, setFilteredShops] = useState<Shop[]>(cachedShops)
  const [activeCategory, setActiveCategory] = useState('All')
  const [dbCategories, setDbCategories] = useState<any[]>(
    cachedCategories.length > 0
      ? [DEFAULT_ALL_CATEGORY, ...cachedCategories]
      : [DEFAULT_ALL_CATEGORY]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(cachedShops.length === 0) // skip spinner if we have cache
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [orderMode, setOrderMode] = useState<'delivery' | 'dinein'>('delivery')
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>(cachedLocations)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // If data is fresh (within 5 min) and we have cached shops, skip network call
    if (!isStale() && cachedShops.length > 0 && !fetchedRef.current) {
      fetchedRef.current = true
      setIsLoading(false)
      if (user?.id) fetchFavorites(user.id)
      return
    }

    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchData() {
      try {
        const [shopsData] = await Promise.all([
          getApprovedShops(),
          getActivePromotions()
        ])

        const sortedShops = shopsData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setShops(sortedShops)
        setFilteredShops(sortedShops)
        storeSetShops(sortedShops)  // persist to localStorage

        const supabase = createClient()
        const { data: catData } = await supabase
          .from('app_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        if (catData && catData.length > 0) {
          setDbCategories([DEFAULT_ALL_CATEGORY, ...catData])
          storeSetCategories(catData)  // persist
        }

        const { data: locData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'delivery_locations')
          .single()
        if (locData && locData.value) {
          try {
            const locs = JSON.parse(locData.value)
            setDeliveryLocations(locs)
            storeSetLocations(locs)  // persist
          } catch (e) {}
        }

        markFetched()  // stamp the timestamp for TTL
        if (user?.id) fetchFavorites(user.id)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  useEffect(() => {
    let result = shops
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      )
    }
    if (activeCategory !== 'All') {
      const c = activeCategory.toLowerCase()
      result = result.filter(s =>
        (s.description && s.description.toLowerCase().includes(c)) ||
        (s.categories && s.categories.some(cat => cat.toLowerCase().includes(c))) ||
        s.name.toLowerCase().includes(c)
      )
    }
    setFilteredShops(result)
  }, [searchQuery, activeCategory, shops])

  const handleSelectLocation = async (loc: string) => {
    if (!user) return
    setIsLocationModalOpen(false)
    try {
      const supabase = createClient()
      await supabase.from('student_profiles').update({ hostel_name: loc }).eq('id', user.id)
      setStudentProfile({ ...studentProfile!, hostel_name: loc })
      toast.success('Delivery location updated!')
    } catch {
      toast.error('Failed to update location')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20 max-w-[430px] mx-auto font-sans">

      {/* ── Header ── */}
      <div className="bg-white px-4 pt-3 pb-3 flex items-center justify-between">
        {/* Left – Hamburger */}
        <Sheet>
          <SheetTrigger render={<button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition cursor-pointer" />}>
            <HamburgerIcon />
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] max-w-[300px] p-0 bg-gray-50">
            <div className="bg-orange-500 p-6 pb-8 rounded-br-3xl shadow-inner">
              <div className="flex items-center gap-2 mt-4">
                <Image src="/dnd-logo.png" alt="Logo" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover shadow-sm border border-orange-400" />
                <h2 className="text-xl font-bold text-white">DineNDeliver</h2>
              </div>
              <p className="text-orange-100 text-sm font-medium mt-1">
                Hello, {user?.full_name || 'Student'}!
              </p>
            </div>
            <div className="flex flex-col gap-2 p-6 mt-2">
              <SheetClose render={<Link href="/student/profile" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition" />}>
                <User size={20} /> <span className="font-bold">Profile</span>
              </SheetClose>
              <SheetClose render={<Link href="/student/orders" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition" />}>
                <ClipboardList size={20} /> <span className="font-bold">My Orders</span>
              </SheetClose>
              <SheetClose render={<Link href="/student/cart" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition" />}>
                <ShoppingCart size={20} /> <span className="font-bold">Cart</span>
              </SheetClose>
              <div className="h-px bg-gray-200 my-2" />
              <SheetClose render={<button onClick={() => useAuthStore.getState().setUser(null)} className="flex items-center gap-4 text-red-500 hover:bg-red-50 p-3 rounded-2xl transition w-full text-left" />}>
                <LogOut size={20} /> <span className="font-bold">Logout</span>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center – Logo + Brand */}
        <div className="flex items-center gap-2">
          <Image src="/dnd-logo.png" alt="Logo" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover shadow-sm border border-orange-100" />
          <span className="text-[20px] font-extrabold tracking-tight text-gray-900">
            DineN<span className="text-[#EA580C]">Deliver</span>
          </span>
        </div>

        {/* Right – Bell */}
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
        >
          <BellIcon />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#EA580C] rounded-full" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="px-4 mt-3 space-y-3">

        {/* ── Delivery / Dine-in Toggle ── */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center w-full">
          <button
            onClick={() => setOrderMode('delivery')}
            className={`flex-1 py-2 rounded-xl text-[14px] font-bold transition-all ${orderMode === 'delivery' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Delivery
          </button>
          <button
            onClick={() => setOrderMode('dinein')}
            className={`flex-1 py-2 rounded-xl text-[14px] font-bold transition-all ${orderMode === 'dinein' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Dine-In
          </button>
        </div>

        {/* ── Location Pill ── */}
        {orderMode === 'delivery' && (
          <div
            onClick={() => setIsLocationModalOpen(true)}
            className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              {/* Orange circle with pin */}
              <div className="w-9 h-9 bg-[#FFF0E6] rounded-full flex items-center justify-center shrink-0">
                <MapPinIcon />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 font-medium leading-tight">Deliver to</span>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] font-bold text-gray-900 leading-tight">
                    {studentProfile?.hostel_name || 'Select Location'}
                  </span>
                  <ChevronDownIcon className="mt-0.5" />
                </div>
              </div>
            </div>
            <div className="w-9 h-9 flex items-center justify-center">
              <GPSIcon />
            </div>
          </div>
        )}

        {/* ── Search Bar ── */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between cursor-text"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <SearchIcon className="shrink-0" />
            <span className="text-[13px] text-gray-400 truncate">Search for food, shops or cuisines...</span>
          </div>
          <div className="w-9 h-9 bg-[#FFF0E6] rounded-full flex items-center justify-center shrink-0">
            <FilterIcon />
          </div>
        </div>

        {/* ── Category Pills ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x pb-1">
          {dbCategories.map((cat) => {
            const isActive = activeCategory === cat.name
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-1.5 flex-shrink-0 cursor-pointer px-3.5 py-2 rounded-full border transition-all snap-start text-[13px] font-semibold ${
                  isActive
                    ? 'bg-[#EA580C] border-[#EA580C] text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {cat.name === 'All' && isActive ? (
                  /* Grid dots icon for active All */
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="white"/>
                    <rect x="10" y="1" width="5" height="5" rx="1" fill="white"/>
                    <rect x="1" y="10" width="5" height="5" rx="1" fill="white"/>
                    <rect x="10" y="10" width="5" height="5" rx="1" fill="white"/>
                  </svg>
                ) : cat.name === 'All' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="#EA580C"/>
                    <rect x="10" y="1" width="5" height="5" rx="1" fill="#EA580C"/>
                    <rect x="1" y="10" width="5" height="5" rx="1" fill="#EA580C"/>
                    <rect x="10" y="10" width="5" height="5" rx="1" fill="#EA580C"/>
                  </svg>
                ) : (
                  <img
                    src={cat.icon_url}
                    alt={cat.name}
                    className="w-5 h-5 object-contain"
                  />
                )}
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* ── Offers Banner ── */}
        <div className="bg-[#FEF3E8] rounded-2xl p-4 flex items-center justify-between relative overflow-hidden border border-orange-100">
          {/* Left content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* % badge */}
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" fill="#EA580C"/>
                <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="Inter, sans-serif">%</text>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-[14px] leading-tight">Great food, great deals!</p>
              <p className="text-gray-500 text-[11px] leading-snug mt-0.5">
                Enjoy exclusive offers and save more<br />on your favorite shops.
              </p>
              <Link href="/student/offers">
                <button className="mt-2 bg-[#EA580C] text-white text-[12px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-orange-700 transition-colors">
                  View Offers
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </Link>
            </div>
          </div>
          {/* Right – Shopping bag illustration */}
          <div className="shrink-0 ml-2">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bag body */}
              <rect x="16" y="30" width="48" height="42" rx="8" fill="#EA580C"/>
              {/* Bag handle */}
              <path d="M28 30V24C28 17.373 33.373 12 40 12C46.627 12 52 17.373 52 24V30" stroke="#EA580C" strokeWidth="5" strokeLinecap="round" fill="none"/>
              {/* Bag handle inner */}
              <path d="M28 30V24C28 17.373 33.373 12 40 12C46.627 12 52 17.373 52 24V30" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" fill="none"/>
              {/* % on bag */}
              <circle cx="35" cy="50" r="4" fill="white" opacity="0.9"/>
              <circle cx="45" cy="62" r="4" fill="white" opacity="0.9"/>
              <line x1="29" y1="65" x2="51" y2="45" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9"/>
              {/* Sparkles */}
              <circle cx="64" cy="24" r="3" fill="#FBBF24"/>
              <circle cx="60" cy="18" r="1.5" fill="#FBBF24" opacity="0.7"/>
              <circle cx="70" cy="30" r="1.5" fill="#FBBF24" opacity="0.7"/>
            </svg>
          </div>
        </div>

        {/* ── Nearby Shops ── */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-extrabold text-gray-900">Nearby Shops</h2>
            <button className="text-[#EA580C] text-[13px] font-bold flex items-center gap-0.5 hover:opacity-80">
              See all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[170px] bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🍽️</p>
              <p className="font-medium">No shops found near you</p>
            </div>
          ) : (
            <motion.div className="space-y-3">
              {filteredShops.map((shop, index) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <ShopCard shop={shop} orderMode={orderMode} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Overlays ── */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* ── Location Modal ── */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsLocationModalOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-w-[430px] mx-auto shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Select Delivery Location</h3>
                  <p className="text-xs text-gray-400 font-medium">Choose your hostel or location</p>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-2 flex-1">
                {deliveryLocations.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-full text-left p-4 rounded-2xl border-2 flex items-center gap-3 transition active:scale-[0.98] ${
                      studentProfile?.hostel_name === loc
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-100 bg-white hover:border-orange-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      studentProfile?.hostel_name === loc ? 'bg-orange-500' : 'bg-gray-100'
                    }`}>
                      <MapPinIcon className={studentProfile?.hostel_name === loc ? 'brightness-200' : ''} />
                    </div>
                    <span className={`font-bold flex-1 ${
                      studentProfile?.hostel_name === loc ? 'text-orange-600' : 'text-gray-700'
                    }`}>
                      {loc}
                    </span>
                    {studentProfile?.hostel_name === loc && (
                      <span className="text-orange-500 font-bold text-lg">✓</span>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => { setIsLocationModalOpen(false); router.push('/student/profile') }}
                  className="w-full p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center gap-3 hover:bg-gray-100 transition mt-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                    <MapPinIcon />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-700 block text-[13px]">Select nearest hostel</span>
                    <span className="text-xs text-gray-400">Update custom address in profile</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Nav rendered by layout ── */}
    </div>
  )
}
