'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import useSound from 'use-sound'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { getAvailableDeliveries, getActiveDeliveries } from '@/lib/supabase/queries/rider'
import RiderBottomNav from '@/components/rider/RiderBottomNav'
import { Order } from '@/types'

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setAvailableOrders, addAvailableOrder, setActiveDeliveries, checkAutoOffline, setIsOnline } = useRiderStore()
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
          // A shop just marked an order as ready! 
          // Fetch full order data to put in pool
          const { data: fullOrder } = await supabase
            .from('orders')
            .select(`*, shops(name, description), order_items(*, partner:partner_shop_id(name))`)
            .eq('id', payload.new.id)
            .single()

          if (fullOrder && !fullOrder.rider_id && (!fullOrder.order_type || fullOrder.order_type === 'delivery')) {
            addAvailableOrder(fullOrder)
            // Play loud alarm for Rider
            const { playRiderAlarm } = require('@/store/riderStore')
            playRiderAlarm()
            
            toast.success('New delivery available!', { 
              id: `order-ready-${fullOrder.id}`, 
              icon: '🛵', 
              duration: 45000 
            })
          }
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 max-w-[430px] mx-auto border-x border-gray-100 shadow-xl">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full bg-[#F0FDF4]">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {!isLoginPage && <RiderBottomNav />}
    </div>
  )
}
