'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import useSound from 'use-sound'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRiderStore } from '@/store/riderStore'
import { getAvailableDeliveries, getActiveDelivery } from '@/lib/supabase/queries/rider'
import RiderBottomNav from '@/components/rider/RiderBottomNav'
import { Order } from '@/types'

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setLoading, isLoading } = useAuthStore()
  const { setAvailableOrders, addAvailableOrder, setActiveDelivery } = useRiderStore()
  const [riderId, setRiderId] = useState<string | null>(null)
  
  // Realtime notification sound for new ready orders
  const [playAlert] = useSound('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg', { volume: 0.8 })

  // 1. Auth Guard
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')

      if (!session) {
        setLoading(false)
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
        await supabase.auth.signOut()
        setLoading(false)
        toast.error('Your account has been suspended by the admin.')
        if (!isLoginRoute) {
          router.replace('/rider/login')
        }
        return
      }

      setUser(profile)
      setRiderId(session.user.id)
      
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
    if (!riderId) return

    async function loadData() {
      try {
        const [available, active] = await Promise.all([
          getAvailableDeliveries(),
          getActiveDelivery(riderId!)
        ])
        setAvailableOrders(available)
        setActiveDelivery(active)
      } catch (err) {
        console.error("Failed to load rider data", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const supabase = createClient()
    const channel = supabase
      .channel('public:orders-ready')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `status=eq.ready` },
        async (payload) => {
          // A shop just marked an order as ready! 
          // Fetch full order data to put in pool
          const { data: fullOrder } = await supabase
            .from('orders')
            .select(`*, shops(name, description)`)
            .eq('id', payload.new.id)
            .single()

          if (fullOrder && !fullOrder.rider_id) {
            addAvailableOrder(fullOrder)
            playAlert()
            toast.success('New delivery available!', { icon: '🛵', duration: 4000 })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [riderId, setAvailableOrders, setActiveDelivery, addAvailableOrder, playAlert, setLoading])

  if (isLoading) {
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
