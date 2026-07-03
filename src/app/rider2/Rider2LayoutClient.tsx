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
import { motion, AnimatePresence } from 'framer-motion'
import { Store, ShoppingBag, GraduationCap } from 'lucide-react'
import { stopRiderAlarm } from '@/store/riderStore'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

function GamifiedProgressBar() {
  const { batchStartTime, activeDeliveries } = useRiderStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Hide if there's no active cycle
  if (activeDeliveries.length === 0 && !batchStartTime) return null

  const BATCH_DUR = 5 * 60 * 1000 // 5 mins
  const DELIVERY_DUR = 15 * 60 * 1000 // 15 mins (Total 20 mins)
  const TOTAL_DUR = BATCH_DUR + DELIVERY_DUR

  const effectiveStartTime = batchStartTime || (activeDeliveries.length > 0 ? new Date(activeDeliveries[0].placed_at).getTime() : null)
  
  if (!effectiveStartTime) return null

  const elapsed = Math.max(0, now - effectiveStartTime)
  const isMaxBatched = activeDeliveries.length >= 3
  
  let phase = 'collection'
  let progressWidth = 0
  let barColor = 'bg-amber-500'
  let message = ''

  if (elapsed > TOTAL_DUR) {
    phase = 'late'
    progressWidth = 100
    barColor = 'bg-red-500 animate-pulse'
    message = 'LATE! Deliver immediately!'
  } else if (elapsed >= BATCH_DUR || isMaxBatched) {
    phase = 'delivery'
    // Starts at 25%, goes to 100%
    const deliveryElapsed = isMaxBatched && elapsed < BATCH_DUR ? 0 : elapsed - BATCH_DUR
    const deliveryProgress = Math.min((deliveryElapsed / DELIVERY_DUR) * 75, 75)
    progressWidth = 25 + deliveryProgress
    barColor = 'bg-[#16A34A]'
    const timeLeft = Math.max(0, TOTAL_DUR - elapsed)
    const minsLeft = Math.floor(timeLeft / 60000)
    const secsLeft = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')
    message = `Deliver to hostel (${minsLeft}:${secsLeft} left)`
  } else {
    phase = 'collection'
    progressWidth = Math.min((elapsed / BATCH_DUR) * 25, 25)
    barColor = 'bg-amber-500'
    const timeLeft = BATCH_DUR - elapsed
    const minsLeft = Math.floor(timeLeft / 60000)
    const secsLeft = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')
    message = `Collect orders (Wait ${minsLeft}:${secsLeft})`
  }

  return (
    <div className="sticky top-0 left-0 right-0 w-full bg-white z-[9999] max-w-[430px] mx-auto pt-4 pb-4 px-5 shadow-sm border-b">
      <div className="flex justify-between items-center mb-3">
        <span className={`font-black tracking-tight text-sm uppercase ${
          phase === 'late' ? 'text-red-500' :
          phase === 'delivery' ? 'text-[#16A34A]' : 'text-amber-500'
        }`}>
          {message}
        </span>
      </div>
      
      <div className="w-full h-3 bg-gray-100 rounded-full relative flex items-center shadow-inner">
        {/* The filling bar */}
        <motion.div 
          className={`h-full rounded-full ${barColor}`} 
          animate={{ width: `${progressWidth}%` }}
          transition={{ ease: 'linear', duration: 1 }}
        />
        
        {/* Milestone Icons */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[0%] -ml-1 w-5 h-5 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10 shadow-sm">
          <Store size={10} className={progressWidth >= 0 ? "text-amber-500" : "text-gray-400"} />
        </div>
        
        <div className="absolute top-1/2 -translate-y-1/2 left-[25%] -ml-2.5 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10 shadow-sm transition-colors duration-500" style={{ borderColor: progressWidth >= 25 ? '#16A34A' : '#e5e7eb' }}>
          <ShoppingBag size={12} className={progressWidth >= 25 ? "text-[#16A34A]" : "text-gray-400"} />
        </div>
        
        <div className="absolute top-1/2 -translate-y-1/2 right-[0%] -mr-1 w-5 h-5 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10 shadow-sm transition-colors duration-500" style={{ borderColor: progressWidth >= 100 ? '#ef4444' : '#e5e7eb' }}>
          <GraduationCap size={10} className={progressWidth >= 100 ? "text-red-500" : "text-gray-400"} />
        </div>
      </div>
    </div>
  )
}

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setAvailableOrders, addAvailableOrder, setActiveDeliveries, checkAutoOffline, setIsOnline, isAlarmRinging, alarmReason } = useRiderStore()
  const [riderId, setRiderId] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  // Auto-unlock audio for background tabs on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      const { initRiderAudio } = require('@/store/riderStore')
      initRiderAudio()
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)
    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

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

  // Auto-unlock audio for background tabs on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      const { initRiderAudio } = require('@/store/riderStore')
      initRiderAudio()
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)
    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // 1. Auth Guard
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isPublicRoute = pathname.includes('/login') || pathname.includes('/register')

      if (!session) {
        clearAuth()
        setLoading(false)
        setIsOnline(false) 
        if (!isPublicRoute) {
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
        if (!isPublicRoute) {
          router.replace('/rider2/login')
        }
        return
      }

      if (profile.status === 'suspended') {
        setLoading(false)
        toast.error('Your account has been suspended by the admin.')
        if (!isPublicRoute) {
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
      
      if (isPublicRoute) {
        setLoading(false)
        router.replace('/rider2/dashboard')
      }
    }
    checkAuth()
  }, [router, pathname, setUser, setLoading])

  // FCM Push Registration
  useEffect(() => {
    async function registerFCM() {
      if (!user?.id || !Capacitor.isNativePlatform()) return

      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('User denied push permission');
          return;
        }

        PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token:', token.value);
          await fetch('/api/fcm/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, token: token.value })
          });
        });

        // Create the custom channel before registering
        try {
          await PushNotifications.createChannel({
            id: 'campus_orders_v2',
            name: 'Campus Orders v2',
            description: 'New order notifications',
            importance: 5, // 5 = MAX importance
            visibility: 1, // 1 = PUBLIC
            sound: 'bell_alarm', // Matches bell_alarm.mp3 in res/raw/
            vibration: true,
          });
        } catch (e) {
          console.error('Failed to create channel:', e);
        }

        await PushNotifications.register();

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

      } catch (err) {
        console.error("FCM Setup Failed", err)
      }
    }

    registerFCM()
  }, [user?.id])

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

  // RELIABLE POLLING FALLBACK (5 seconds)
  // Bypasses any Supabase Realtime limitations or dropped socket connections
  useEffect(() => {
    let isMounted = true;
    
    const pollOrders = async () => {
      try {
        const { getAvailableDeliveries, getActiveDeliveries } = await import('@/lib/supabase/queries/rider')
        const currentRiderId = useAuthStore.getState().user?.id
        
        // Fetch available
        const available = await getAvailableDeliveries()
        if (!isMounted) return;
        
        const currentAvailable = useRiderStore.getState().availableOrders
        const newAvailable = available.filter(ao => !currentAvailable.some(co => co.id === ao.id && co.status === ao.status))
        
        if (newAvailable.length > 0) {
          useRiderStore.getState().setAvailableOrders(available)
          const hasNewReady = newAvailable.some(no => no.status === 'ready' && !currentAvailable.some(co => co.id === no.id));
          if (hasNewReady) {
            const { playRiderAlarm } = require('@/store/riderStore')
            playRiderAlarm({ title: 'New Delivery Available!', message: `A new order is ready for pickup in the pool!` })
          }
        }

        // Fetch active for this rider
        if (currentRiderId) {
          const active = await getActiveDeliveries(currentRiderId)
          if (!isMounted) return;
          const currentActive = useRiderStore.getState().activeDeliveries
          const newActive = active.filter(ao => !currentActive.some(co => co.id === ao.id && co.status === ao.status))
          if (newActive.length > 0) {
            useRiderStore.getState().setActiveDeliveries(active)
          }
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    };

    const interval = setInterval(pollOrders, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [])

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
    <div className={`min-h-screen flex flex-col pb-20 w-full max-w-[430px] mx-auto overflow-x-hidden shadow-xl relative ${isAlarmRinging ? 'ringing-rider-container bg-green-50' : 'bg-gray-50 border-x border-gray-100'}`}>
      <GamifiedProgressBar />
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <AnimatePresence>
        {isAlarmRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <span className="text-4xl">🚨</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{alarmReason?.title || "Alarm"}</h2>
              <p className="text-gray-600 mb-8">{alarmReason?.message || "Wake up! Action required."}</p>
              
              <button
                onClick={stopRiderAlarm}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-600/30 active:scale-95 transition"
              >
                DISMISS ALARM
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      
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
