'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { getAvailableDeliveries, getActiveDeliveries } from '@/lib/supabase/queries/rider'
import Rider2BottomNav from '@/components/rider2/Rider2BottomNav'
import { Order } from '@/types'
import CompleteProfileOverlay from '@/components/shared/CompleteProfileOverlay'

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setAvailableOrders, addAvailableOrder, setActiveDeliveries, checkAutoOffline, setIsOnline } = useRiderStore()
  const [riderId, setRiderId] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  // Inject PWA manifest link into document head + register service worker
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()
    
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/rider2-manifest.json'
    document.head.appendChild(link)

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = '#16A34A'

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
        setIsOnline(false) 
        if (!isLoginRoute) {
          router.replace('/rider2/login')
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
          router.replace('/rider2/login')
        }
        return
      }

      if (profile.status === 'suspended') {
        setLoading(false)
        toast.error('Your account has been suspended by the admin.')
        if (!isLoginRoute) {
          router.replace('/rider2/login')
        }
        return
      }

      setUser(profile)
      setRiderId(session.user.id)

      if (!profile.phone) {
        setNeedsOnboarding(true)
        setLoading(false)
        return
      }

      checkAutoOffline() 
      
      if (isLoginRoute) {
        setLoading(false)
        router.replace('/rider2/dashboard')
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
          const { data: fullOrder } = await supabase
            .from('orders')
            .select(`*, shops(name, description), order_items(*, partner:partner_shop_id(name))`)
            .eq('id', payload.new.id)
            .single()

          if (fullOrder && !fullOrder.rider_id && (!fullOrder.order_type || fullOrder.order_type === 'delivery')) {
            addAvailableOrder(fullOrder)
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

  const isLoginPage = pathname === '/rider2/login'

  if (pathname.includes('/login')) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 max-w-[430px] mx-auto border-x border-gray-100 shadow-xl relative">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      
      {needsOnboarding && user && (
        <CompleteProfileOverlay 
          role="rider" 
          userId={user.id} 
          onComplete={() => {
            setNeedsOnboarding(false)
            window.location.reload()
          }} 
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-[#F0FDF4] overflow-y-auto scrollbar-hide">
        {children}
      </main>

      {!isLoginPage && <Rider2BottomNav />}
    </div>
  )
}
