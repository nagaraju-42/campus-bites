'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Bell, Search, Menu } from 'lucide-react'
import { getApprovedShops } from '@/lib/supabase/queries/shops'
import { Shop } from '@/types'
import ShopCard from '@/components/student/ShopCard'
import CategoryChip from '@/components/student/CategoryChip'
import { useAuthStore } from '@/store/authStore'
import NotificationsTray from '@/components/shared/NotificationsTray'

const CATEGORIES = ['All', 'Biryani', 'Snacks', 'Combos', 'Drinks', 'Chinese']

export default function StudentHomePage() {
  const { user } = useAuthStore()
  const [shops, setShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => {
    async function fetchShops() {
      try {
        const data = await getApprovedShops()
        setShops(data)
        setFilteredShops(data)
      } catch (err) {
        console.error('Failed to load shops:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchShops()
  }, [])

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
          <button className="text-gray-900"><Menu size={24} /></button>
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
        <div className="mt-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for food or shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none shadow-sm font-medium"
          />
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

        {/* Promo Banner */}
        <div className="bg-[#18181B] rounded-3xl p-5 flex items-center justify-between shadow-xl mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAB308] rounded-full opacity-10 blur-2xl"></div>
          <div className="z-10">
            <p className="text-[#EAB308] font-bold text-xl font-display mb-1">Flat 10% OFF</p>
            <p className="text-gray-300 text-xs font-medium">On your first order 🎉</p>
            <button className="mt-3 text-xs bg-[#EAB308] text-gray-900 font-bold px-3 py-1.5 rounded-lg">ORDER NOW</button>
          </div>
          <span className="text-6xl z-10 drop-shadow-xl relative right-2">🥘</span>
        </div>
      </div>
      
      <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
