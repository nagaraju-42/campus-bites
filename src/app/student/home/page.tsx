'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Bell, Search, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getApprovedShops } from '@/lib/supabase/queries/shops'
import { getStudentOrders } from '@/lib/supabase/queries/orders'
import { Shop, Order } from '@/types'
import ShopCard from '@/components/student/ShopCard'
import CategoryChip from '@/components/student/CategoryChip'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import NotificationsTray from '@/components/shared/NotificationsTray'
import { getActivePromotions, Promotion } from '@/lib/supabase/queries/promotions'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import Link from 'next/link'
import { ShoppingCart, ClipboardList, User, LogOut, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SearchOverlay from '@/components/student/SearchOverlay'

const DEFAULT_ALL_CATEGORY = {
  name: 'All',
  icon_url: 'https://unpkg.com/emoji-datasource-apple@15.0.1/img/apple/64/1f37d-fe0f.png'
}

export default function StudentHomePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const { setCart } = useCartStore()
  
  const [shops, setShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [dbCategories, setDbCategories] = useState<any[]>([DEFAULT_ALL_CATEGORY])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [globalDineInEnabled, setGlobalDineInEnabled] = useState(false)
  const [orderMode, setOrderMode] = useState<'delivery' | 'dine_in'>('delivery')
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const { studentProfile, setStudentProfile } = useAuthStore()

  useEffect(() => {
    async function fetchData() {
      try {
        const [shopsData, promosData] = await Promise.all([
          getApprovedShops(),
          getActivePromotions()
        ])
        setShops(shopsData)
        setFilteredShops(shopsData)
        setPromotions(promosData)

        const supabase = createClient()
        const { data: catData } = await supabase.from('app_categories').select('*').eq('is_active', true).order('display_order', { ascending: true })
        if (catData && catData.length > 0) {
          setDbCategories([DEFAULT_ALL_CATEGORY, ...catData])
        }

        const { data: settings } = await supabase.from('app_settings').select('dine_in_enabled').limit(1).single()
        if (settings) {
          setGlobalDineInEnabled(settings.dine_in_enabled)
        }

        const { data: locData } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
        if (locData && locData.value) {
          try {
            setDeliveryLocations(JSON.parse(locData.value))
          } catch(e) {}
        }

        // Fetch last order for Magic Reorder
        if (user?.id) {
          const orders = await getStudentOrders(user.id)
          const latestDelivered = orders.find(o => o.status === 'delivered')
          if (latestDelivered) {
            setLastOrder(latestDelivered)
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  const handleMagicReorder = () => {
    if (!lastOrder || !lastOrder.order_items) return
    const cartItems = lastOrder.order_items.map(item => ({
      id: item.menu_item_id,
      shopId: lastOrder.shop_id,
      shopName: lastOrder.shops?.name || 'Shop',
      name: item.item_name,
      price: item.unit_price,
      quantity: item.quantity
    }))
    setCart(lastOrder.shop_id, cartItems)
    router.push('/student/checkout')
  }

  const handleSelectLocation = async (loc: string) => {
    if (!user) return
    setIsLocationModalOpen(false)
    try {
      const supabase = createClient()
      await supabase.from('student_profiles').update({ hostel_name: loc }).eq('id', user.id)
      setStudentProfile({ ...studentProfile!, hostel_name: loc })
      toast.success('Delivery location updated!')
    } catch (e) {
      toast.error('Failed to update location')
    }
  }

  // Realtime Broadcast Listener
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    
    const channel = supabase
      .channel(`student-broadcasts-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notification = payload.new as any
          if (notification.type === 'broadcast') {
            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-[#EAB308]`}>
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <span className="text-2xl">📢</span>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-500 font-medium">{notification.message}</p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 focus:outline-none">
                    Close
                  </button>
                </div>
              </div>
            ), { duration: 8000, position: 'top-center' })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    let result = shops
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      result = result.filter((s) =>
        s.name.toLowerCase().includes(searchLower) || 
        (s.description && s.description.toLowerCase().includes(searchLower))
      )
    }
    if (activeCategory !== 'All') {
      const catLower = activeCategory.toLowerCase()
      result = result.filter(s => 
        (s.description && s.description.toLowerCase().includes(catLower)) || 
        s.name.toLowerCase().includes(catLower)
      )
    }
    setFilteredShops(result)
  }, [searchQuery, activeCategory, shops])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-[#DC2626] px-5 pt-12 pb-8 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-6">
          <Sheet>
            <SheetTrigger>
              <div className="text-white hover:bg-black/10 p-2 rounded-full transition cursor-pointer"><Menu size={24} /></div>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-[300px] sm:max-w-[300px] p-0 bg-gray-50">
              <div className="bg-[#DC2626] p-6 pb-8 rounded-br-3xl shadow-inner">
                <h2 className="text-2xl font-display font-bold text-white mt-4">TapNosh</h2>
                <p className="text-red-100 text-sm font-medium">Hello, {user?.full_name || 'Student'}!</p>
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
          <div className="flex flex-col items-center cursor-pointer hover:bg-black/10 px-4 py-1.5 rounded-2xl transition" onClick={() => setIsLocationModalOpen(true)}>
            <div className="flex items-center gap-1.5 text-white font-bold text-lg">
              <MapPin size={16} />
              <span className="truncate max-w-[200px]">{studentProfile?.hostel_name || 'Select Location'}</span>
            </div>
            <p className="text-red-100 text-xs font-medium mt-0.5">Deliver to this address ▼</p>
          </div>
          <button onClick={() => setIsNotificationsOpen(true)} className="relative text-white hover:bg-black/10 p-2 rounded-full transition">
            <Bell size={24} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-[#DC2626]"></span>
          </button>
        </div>

        {/* Order Mode Toggle */}
        {globalDineInEnabled && (
          <div className="bg-black/20 p-1 rounded-xl flex items-center mb-5 backdrop-blur-sm">
            <button
              onClick={() => setOrderMode('delivery')}
              className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${orderMode === 'delivery' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              🛵 Delivery
            </button>
            <button
              onClick={() => setOrderMode('dine_in')}
              className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${orderMode === 'dine_in' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-white/80 hover:text-white'}`}
            >
              🍽️ Dine-In
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative" onClick={() => setIsSearchOpen(true)}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <div className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-sm text-gray-400 shadow-sm font-medium cursor-text flex items-center border border-transparent hover:border-red-200 transition">
            Search for your favorite food or shop...
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-8">
        {/* Category Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 pt-2 px-1 snap-x hide-scrollbar">
          {dbCategories.map((cat, i) => (
            <div 
              key={cat.name} 
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-2 flex-shrink-0 cursor-pointer px-4 py-2.5 rounded-full shadow-sm border transition-all snap-start ${
                activeCategory === cat.name 
                  ? 'bg-gray-900 border-gray-900 shadow-md scale-[1.02]' 
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
                <img 
                  src={cat.icon_url}
                  alt={cat.name}
                  className="w-5 h-5 object-contain drop-shadow-sm"
                />
              <span className={`text-xs font-bold ${activeCategory === cat.name ? 'text-white' : 'text-gray-700'}`}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>

        {/* Magic 1-Click Reorder */}
        {lastOrder && (
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-5 shadow-xl relative overflow-hidden border border-gray-800">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#DC2626] rounded-full opacity-20 blur-[50px] mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500 rounded-full opacity-10 blur-[40px] mix-blend-screen"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✨</span>
                  <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 font-bold text-lg font-display">Order it again!</h3>
                </div>
                <p className="text-gray-400 text-sm font-medium mb-4">Your last meal from <span className="font-bold text-white">{lastOrder.shops?.name}</span></p>
                <div className="flex gap-2 flex-wrap mb-5">
                  {lastOrder.order_items?.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="bg-white/10 backdrop-blur-sm border border-white/10 text-gray-200 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                      {item.quantity}x {item.item_name}
                    </span>
                  ))}
                  {lastOrder.order_items && lastOrder.order_items.length > 2 && (
                    <span className="bg-white/10 backdrop-blur-sm border border-white/10 text-gray-200 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                      +{lastOrder.order_items.length - 2} more
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={handleMagicReorder}
                className="w-full bg-[#DC2626] text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition active:scale-[0.98] flex items-center justify-center gap-2 tracking-wide"
              >
                <RotateCcw size={18} /> ADD TO CART
              </button>
            </div>
          </div>
        )}

        {/* Nearby Shops Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-gray-900">Nearby Shops</h2>
            <button className="text-[#DC2626] text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg">See all</button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🍽️</p>
              <p>No shops found near you</p>
            </div>
          ) : (
            <motion.div className="space-y-4">
              {filteredShops.map((shop, index) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                >
                  <ShopCard shop={shop} orderMode={orderMode} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Promo Banners */}
        {promotions.length > 0 ? (
          <div className="space-y-4 mt-4">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-gradient-to-br from-[#18181B] to-gray-900 rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC2626] rounded-full opacity-10 blur-2xl"></div>
                <div className="z-10">
                  <p className="text-[#DC2626] font-bold text-xl font-display mb-1">Flat {promo.discount_percent}% OFF</p>
                  <p className="text-gray-300 text-xs font-medium">{promo.banner_text}</p>
                  <div className="mt-3 inline-block bg-[#DC2626]/10 px-3 py-1.5 rounded-lg border border-[#DC2626]/20">
                    <span className="text-xs text-red-400 font-mono font-bold tracking-wider">CODE: {promo.code}</span>
                  </div>
                </div>
                <span className="text-6xl z-10 drop-shadow-xl relative right-2">🥘</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#18181B] to-gray-900 rounded-3xl p-5 flex items-center justify-between shadow-xl mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC2626] rounded-full opacity-10 blur-2xl"></div>
            <div className="z-10">
              <p className="text-[#DC2626] font-bold text-xl font-display mb-1">Flat 10% OFF</p>
              <p className="text-gray-300 text-xs font-medium">On your first order 🎉</p>
              <button className="mt-3 text-xs bg-[#DC2626] text-white font-bold px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)]">ORDER NOW</button>
            </div>
            <span className="text-6xl z-10 drop-shadow-xl relative right-2">🥘</span>
          </div>
        )}
      </div>
      
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Location Selection Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              onClick={() => setIsLocationModalOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-w-[430px] mx-auto shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Select Delivery Location</h3>
                  <p className="text-xs text-gray-500 font-medium">Choose your hostel or location</p>
                </div>
                <button 
                  onClick={() => setIsLocationModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-2 flex-1">
                {deliveryLocations.map((loc, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectLocation(loc)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      studentProfile?.hostel_name === loc 
                        ? 'border-[#DC2626] bg-red-50' 
                        : 'border-gray-100 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${studentProfile?.hostel_name === loc ? 'bg-[#DC2626] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <MapPin size={16} />
                      </div>
                      <span className={`font-bold ${studentProfile?.hostel_name === loc ? 'text-[#DC2626]' : 'text-gray-700'}`}>{loc}</span>
                    </div>
                    {studentProfile?.hostel_name === loc && (
                      <span className="text-[#DC2626] text-sm font-bold">✓</span>
                    )}
                  </div>
                ))}
                
                <div 
                  onClick={() => {
                    setIsLocationModalOpen(false)
                    router.push('/student/profile')
                  }}
                  className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition mt-4"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Select nearest hostel</span>
                    <span className="text-xs text-gray-500">Update custom address in profile</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
