'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon, ShieldCheck, MapPin, Bike, Bell, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import toast from 'react-hot-toast'

export default function RiderProfilePage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const { activeDeliveries, dedicatedShopId, setDedicatedShopId } = useRiderStore()
  const [shops, setShops] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    async function fetchShops() {
      const supabase = createClient()
      const { data } = await supabase.from('shops').select('id, name').order('name')
      if (data) setShops(data)
    }
    fetchShops()
  }, [])

  const handleLogout = async () => {
    if (activeDeliveries.length > 0) {
      toast.error("You can't log out while you have an active delivery!")
      return
    }

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      toast.success('Offline & Logged out successfully')
      router.replace('/rider2/login')
    } catch (err) {
      toast.error('Failed to log out')
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#F0FDF4] pb-24">
      {/* Header Profile Section */}
      <div className="bg-[#16A34A] pt-12 pb-8 px-6 rounded-b-3xl shadow-lg shadow-green-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#16A34A] shadow-inner text-4xl mb-4 border-4 border-green-400">
            {user.full_name?.charAt(0).toUpperCase() || <UserIcon size={40} />}
          </div>
          <h1 className="text-2xl font-display font-bold text-white">{user.full_name}</h1>
          <p className="text-green-100 font-medium">{user.email}</p>
          <div className="flex items-center gap-2 mt-3 bg-green-800/40 text-green-50 text-xs font-bold px-3 py-1.5 rounded-full border border-green-500/50">
            <ShieldCheck size={14} className="text-emerald-400" /> Verified Delivery Partner
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
            <Bike size={24} className="text-[#16A34A] mb-2" />
            <p className="text-xs font-bold text-gray-400 uppercase">Vehicle</p>
            <p className="font-bold text-gray-900">Bicycle</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
            <MapPin size={24} className="text-[#16A34A] mb-2" />
            <p className="text-xs font-bold text-gray-400 uppercase">Zone</p>
            <p className="font-bold text-gray-900">North Campus</p>
          </div>
        </div>

        {/* Action Menu */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
          <button className="w-full flex items-center gap-4 p-4 border-b border-gray-50 hover:bg-green-50 transition text-left">
            <div className="w-10 h-10 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Notification Settings</p>
              <p className="text-xs text-gray-500">Manage sound alerts for new orders</p>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-4 border-b border-gray-50 hover:bg-green-50 transition text-left">
            <div className="w-10 h-10 bg-green-50 text-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Rider Support</p>
              <p className="text-xs text-gray-500">Contact admin for payment issues</p>
            </div>
          </button>
        </div>

        {/* Dedicated Shop Mode */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-gray-900">Dedicated Shop Mode</p>
              <p className="text-xs text-gray-500 max-w-[200px]">Only see orders from a specific shop in your delivery pool.</p>
            </div>
            <button 
              onClick={() => setDedicatedShopId(dedicatedShopId ? null : shops[0]?.id || null)}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out shadow-inner ${
                dedicatedShopId ? 'bg-[#16A34A]' : 'bg-gray-300'
              }`}
            >
              <div 
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                  dedicatedShopId ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          {dedicatedShopId && (
            <div className="mt-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Your Shop</label>
              <select
                value={dedicatedShopId}
                onChange={(e) => setDedicatedShopId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:border-[#16A34A] transition"
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full mt-4 bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition active:scale-95 shadow-sm"
        >
          <LogOut size={20} />
          Go Offline & Log Out
        </button>

        <p className="text-center text-xs text-gray-400 font-medium pt-4">
          CampusDelivery Partner App v1.0.0
        </p>
      </div>
    </div>
  )
}
