'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

const CATEGORIES = ['All', 'Biryani', 'Snacks', 'Combos', 'Drinks', 'Chinese']

export default function StudentHomePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const { setCart } = useCartStore()
  
  const [shops, setShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [lastOrder, setLastOrder] = useState<Order | null>(null)

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
      result = result.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    setFilteredShops(result)
  }, [searchQuery, activeCategory, shops])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-[#EAB308] px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <Sheet>
            <SheetTrigger>
              <div className="text-gray-900 hover:opacity-70 transition cursor-pointer"><Menu size={24} /></div>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-[300px] sm:max-w-[300px] p-0 bg-gray-50">
              <div className="bg-[#EAB308] p-6 pb-8 rounded-br-3xl">
                <h2 className="text-2xl font-display font-bold text-gray-900 mt-4">CampusBites</h2>
                <p className="text-yellow-900 text-sm font-medium">Hello, {user?.full_name || 'Student'}!</p>
              </div>
              <div className="flex flex-col gap-2 p-6 mt-2">
                <SheetClose>
                  <Link href="/student/profile" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition">
                    <User size={20} /> <span className="font-bold">Profile</span>
                  </Link>
                </SheetClose>
                <SheetClose>
                  <Link href="/student/orders" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition">
                    <ClipboardList size={20} /> <span className="font-bold">My Orders</span>
                  </Link>
                </SheetClose>
                <SheetClose>
                  <Link href="/student/cart" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition">
                    <ShoppingCart size={20} /> <span className="font-bold">Cart</span>
                  </Link>
                </SheetClose>
                <div className="h-px bg-gray-200 my-2" />
                <SheetClose>
                  <button onClick={() => useAuthStore.getState().setUser(null)} className="flex items-center gap-4 text-red-500 hover:bg-red-50 p-3 rounded-2xl transition w-full text-left">
                    <LogOut size={20} /> <span className="font-bold">Logout</span>
                  </button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-gray-900 font-bold">
              <MapPin size={14} />
              <span>Anurag University</span>
            </div>
            <p className="text-yellow-900 text-xs font-medium">Jodimetla, Hyderabad ▼</p>
          </div>
          <button onClick={() => setIsNotificationsOpen(true)} className="relative hover:scale-110 transition">
            <Bell size={24} className="text-gray-900" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#EAB308]"></span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative" onClick={() => setIsSearchOpen(true)}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <div className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-sm text-gray-400 shadow-sm font-medium cursor-text flex items-center">
            Search for food or shops...
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-6">
        {/* Category Icons */}
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 pt-2">
          {CATEGORIES.map((cat, i) => (
            <div key={cat} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                <span className="text-2xl">{i===0?'🍽️':i===1?'🍲':i===2?'🍟':i===3?'🍱':i===4?'🥤':'🍜'}</span>
              </div>
              <span className="text-xs font-bold text-gray-700">{cat}</span>
            </div>
          ))}
        </div>

        {/* Magic 1-Click Reorder */}
        {lastOrder && (
          <div className="bg-[#18181B] rounded-3xl p-5 shadow-xl relative overflow-hidden border border-gray-800">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#EAB308] rounded-full opacity-10 blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">✨</span>
                  <h3 className="text-[#EAB308] font-bold text-lg font-display">Order it again!</h3>
                </div>
                <p className="text-gray-300 text-sm font-medium mb-3">Your last meal from <span className="font-bold text-white">{lastOrder.shops?.name}</span></p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {lastOrder.order_items?.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="bg-white/10 text-gray-200 text-xs font-bold px-2 py-1 rounded-md">
                      {item.quantity}x {item.item_name}
                    </span>
                  ))}
                  {lastOrder.order_items && lastOrder.order_items.length > 2 && (
                    <span className="bg-white/10 text-gray-200 text-xs font-bold px-2 py-1 rounded-md">
                      +{lastOrder.order_items.length - 2} more
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={handleMagicReorder}
                className="w-full bg-[#EAB308] text-gray-900 font-bold py-3 rounded-xl shadow-lg shadow-yellow-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Add to Cart
              </button>
            </div>
          </div>
        )}

        {/* Nearby Shops Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-gray-900">Nearby Shops</h2>
            <button className="text-[#EAB308] text-sm font-bold">See all</button>
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
                  <ShopCard shop={shop} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Promo Banners */}
        {promotions.length > 0 ? (
          <div className="space-y-4 mt-4">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-[#18181B] rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAB308] rounded-full opacity-10 blur-2xl"></div>
                <div className="z-10">
                  <p className="text-[#EAB308] font-bold text-xl font-display mb-1">Flat {promo.discount_percent}% OFF</p>
                  <p className="text-gray-300 text-xs font-medium">{promo.banner_text}</p>
                  <div className="mt-3 inline-block bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <span className="text-xs text-white font-mono font-bold tracking-wider">CODE: {promo.code}</span>
                  </div>
                </div>
                <span className="text-6xl z-10 drop-shadow-xl relative right-2">🥘</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#18181B] rounded-3xl p-5 flex items-center justify-between shadow-xl mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAB308] rounded-full opacity-10 blur-2xl"></div>
            <div className="z-10">
              <p className="text-[#EAB308] font-bold text-xl font-display mb-1">Flat 10% OFF</p>
              <p className="text-gray-300 text-xs font-medium">On your first order 🎉</p>
              <button className="mt-3 text-xs bg-[#EAB308] text-gray-900 font-bold px-3 py-1.5 rounded-lg">ORDER NOW</button>
            </div>
            <span className="text-6xl z-10 drop-shadow-xl relative right-2">🥘</span>
          </div>
        )}
      </div>
      
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
