'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { getAvailableDeliveries, getActiveDeliveries } from '@/lib/supabase/queries/rider'
import RiderBottomNav from '@/components/rider/RiderBottomNav'
import { Order } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { stopRiderAlarm } from '@/store/riderStore'

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setAvailableOrders, addAvailableOrder, setActiveDeliveries, checkAutoOffline, setIsOnline, isAlarmRinging, alarmReason } = useRiderStore()
  const [riderId, setRiderId] = useState<string | null>(null)

  // Inject PWA manifest link into document head + register service worker
  useEffect(() => {
    // Remove any existing manifest link
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()
    
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/rider-manifest.json'
    document.head.appendChild(link)

    // Set theme color
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = '#16A34A'

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registered:', reg.scope)
      }).catch((err) => {
        console.error('SW registration failed:', err)
      })
    }

    return () => {
      link.remove()
    }
  }, [])

  // 1. Auth Guard
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')

      if (!session) {
        clearAuth()
        setLoading(false)
        setIsOnline(false) // Reset online status on logout
        if (!isLoginRoute) {
          router.replace('/rider/login')
        }
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !profile || (profile.role !== 'rider' && profile.role !== 'admin')) {
        setLoading(false)
        if (!isLoginRoute) {
          router.replace('/rider/login')
        }
        return
      }

      if (profile.status === 'suspended') {
        setLoading(false)
        toast.error('Your account has been suspended by the admin.')
        if (!isLoginRoute) {
          router.replace('/rider/login')
        }
        return
      }

      setUser(profile)
      setRiderId(session.user.id)
      checkAutoOffline() // Check if 30 mins passed
      
      // If they are on login page but already logged in, send to pool
      if (isLoginRoute) {
        setLoading(false)
        router.replace('/rider/pool')
      }
    }
    checkAuth()
  }, [router, pathname, setUser, setLoading])

  // 2. Load Data & Setup Realtime Listener
  useEffect(() => {
    if (!riderId && !user?.id) return
    const targetRiderId = riderId || user?.id

    async function loadData() {
      try {
        const [available, active] = await Promise.all([
          getAvailableDeliveries(),
          getActiveDeliveries(targetRiderId!)
        ])
        setAvailableOrders(available)
        setActiveDeliveries(active)
      } catch (err) {
        console.error("Failed to load rider data", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const supabase = createClient()
    const channel = supabase
      .channel(`public:orders-ready-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `status=eq.ready` },
        async (payload) => {
          // Wait briefly to ensure any related updates are committed
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { getAvailableDeliveries } = await import('@/lib/supabase/queries/rider')
          const available = await getAvailableDeliveries()
          useRiderStore.getState().setAvailableOrders(available)
          
          const { playRiderAlarm } = require('@/store/riderStore')
          playRiderAlarm({ title: 'New Delivery Available!', message: `A new order is ready for pickup in the pool!` })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `status=eq.delivered` },
        async (payload) => {
          const { getActiveDeliveries } = await import('@/lib/supabase/queries/rider')
          const active = await getActiveDeliveries(riderId!)
          useRiderStore.getState().setActiveDeliveries(active)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [riderId, user?.id, setAvailableOrders, setActiveDeliveries, addAvailableOrder, setLoading])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0FDF4]">
        <div className="w-12 h-12 border-4 border-[#16A34A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#16A34A] font-bold text-sm">Loading Rider Portal...</p>
      </div>
    )
  }

  // Determine if it's the login page to hide nav
  const isLoginPage = pathname === '/rider/login'

  return (
    <div className={`min-h-screen flex flex-col pb-20 max-w-[430px] mx-auto shadow-xl relative ${isAlarmRinging ? 'ringing-rider-container bg-green-50' : 'bg-gray-50 border-x border-gray-100'}`}>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <AnimatePresence>
        {isAlarmRinging && alarmReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border-4 border-green-500 ringing-rider-container"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-4xl animate-bounce">
                🔔
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{alarmReason.title}</h2>
              <p className="text-gray-600 mb-6 text-sm">
                {alarmReason.message}
              </p>
              <button
                onClick={() => stopRiderAlarm()}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition"
              >
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full bg-[#F0FDF4]">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {!isLoginPage && <RiderBottomNav />}
    </div>
  )
}
