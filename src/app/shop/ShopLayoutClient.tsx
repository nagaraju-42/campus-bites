'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner } from '@/lib/supabase/queries/shop-dashboard'
import { AlertCircle, ShieldAlert, Smartphone, Volume2 } from 'lucide-react'
import ShopSidebar from '@/components/shop/ShopSidebar'
import ShopBottomNav from '@/components/shop/ShopBottomNav'
import AdminImpersonationBanner from '@/components/admin/AdminImpersonationBanner'
import CompleteProfileOverlay from '@/components/shared/CompleteProfileOverlay'
import FocusedOrderModal from '@/components/shop/FocusedOrderModal'
import { motion, AnimatePresence } from 'framer-motion'
import { stopShopAlarm, initShopAudio } from '@/store/shopOrdersStore'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isKDS = pathname === '/shop/kds' || pathname === '/shop/live'
  
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setShopId, addOrder, updateOrderStatus, isAlarmRinging } = useShopOrdersStore()
  const [shopOwnerId, setShopOwnerId] = useState<string | null>(null)
  
  // Auto-unlock audio for background tabs on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      initShopAudio()
      setAudioUnlocked(true)
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
  
  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsShopCreation, setNeedsShopCreation] = useState(false)
  
  // Track shop open status for mid-session closure warning
  const [shopIsOpen, setShopIsOpen] = useState<boolean | null>(null)
  const [shopIdForWatch, setShopIdForWatch] = useState<string | null>(null)

  // Global Cancellation Alert State
  const [cancellationAlert, setCancellationAlert] = useState<{ orderNumber: string, reason: string } | null>(null)

  // Audio unlock state - Android WebView blocks audio until user taps
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // APK Device Registration Modal
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [savingDevice, setSavingDevice] = useState(false)

  // Inject PWA manifest link into document head + register service worker
  useEffect(() => {
    // Remove any existing manifest link
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()
    
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/shop-manifest.json'
    document.head.appendChild(link)

    // Set theme color
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = '#0F172A'

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
        if (!isLoginRoute) {
          router.replace('/shop/login')
        }
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !profile || (profile.role !== 'shop_owner' && profile.role !== 'kitchen' && profile.role !== 'admin')) {
        setLoading(false)
        if (!isLoginRoute) {
          router.replace('/shop/login')
        }
        return
      }

      if (profile.status === 'suspended') {
        setLoading(false)
        toast.error('Your account has been suspended by the admin.')
        if (!isLoginRoute) {
          router.replace('/shop/login')
        }
        return
      }

      setUser(profile)
      setShopOwnerId(session.user.id)
      
      // If they are on login page but already logged in, send to dashboard
      if (isLoginRoute) {
        setLoading(false)
        router.replace('/shop/dashboard')
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

          // APK Device Tracker: show modal if no device name saved yet
          const savedDeviceName = localStorage.getItem('apk_device_name')
          if (!savedDeviceName) {
            setShowDeviceModal(true)
          } else {
            // Update last_seen_at silently
            fetch('/api/apk/register-device', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, deviceName: savedDeviceName, fcmToken: token.value })
            }).catch(() => {})
          }
        });

        // Create the custom channel before registering
        try {
          await PushNotifications.createChannel({
            id: 'campus_orders_v4',
            name: 'Campus Orders Alerts (v4)',
            description: 'Critical new order notifications',
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

        // Handle tapping on a push notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed:', notification);
          const data = notification.notification.data;
          if (data && data.orderId) {
            // Set focused order ID so the dashboard opens it immediately
            useShopOrdersStore.getState().setFocusedOrderId(data.orderId);
            // Ensure audio stops if they click the notification
            stopShopAlarm();
          }
        });

      } catch (err) {
        console.error("FCM Setup Failed", err)
      }
    }

    registerFCM()
  }, [user?.id])

  // Global Audio Unlocker (Fallback for missed banner)
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioUnlocked) {
        initShopAudio()
        setAudioUnlocked(true)
        document.removeEventListener('touchstart', unlockAudio)
        document.removeEventListener('click', unlockAudio)
      }
    }
    document.addEventListener('touchstart', unlockAudio, { once: true })
    document.addEventListener('click', unlockAudio, { once: true })
    
    return () => {
      document.removeEventListener('touchstart', unlockAudio)
      document.removeEventListener('click', unlockAudio)
    }
  }, [audioUnlocked])

  // 2. Fetch Shop Details & Setup Realtime
  useEffect(() => {
    if (!shopOwnerId && !user?.id) return
    const targetOwnerId = shopOwnerId || user?.id

    async function loadShop() {
      try {
        const shopData = await getShopDetailsByOwner(targetOwnerId!)
        
        // Check Onboarding
        const isProfileIncomplete = !useAuthStore.getState().user?.phone
        if (!shopData || isProfileIncomplete) {
          setNeedsShopCreation(!shopData)
          setNeedsOnboarding(true)
          setLoading(false)
          return
        }

        if (shopData) {
          setShopId(shopData.id)
          setShopIdForWatch(shopData.id)
          setShopIsOpen(shopData.is_open)
          
          // Fix: Fetch initial orders so they don't disappear on direct page load
          const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
          const activeOrders = await getShopActiveOrders(shopData.id)
          useShopOrdersStore.getState().setOrders(activeOrders)

          setupRealtime(shopData.id)
        }
      } catch (err) {
        console.error("Failed to load shop", err)
      } finally {
        setLoading(false)
      }
    }
    loadShop()

    function setupRealtime(sid: string) {
      const supabase = createClient()
      const channel = supabase
        .channel(`shop-${sid}-orders-${Math.random()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `shop_id=eq.${sid}` },
          async (payload) => {
            // Wait 1s to ensure order_items are inserted
            await new Promise(resolve => setTimeout(resolve, 1000))
            const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
            const activeOrders = await getShopActiveOrders(sid)
            useShopOrdersStore.getState().setOrders(activeOrders)
            
            // Play loud alarm for KDS
            const { playShopAlarm } = require('@/store/shopOrdersStore')
            playShopAlarm()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `shop_id=eq.${sid}` },
          async (payload) => {
            if (payload.new.status === 'cancelled' && payload.old.status !== 'cancelled') {
              if (payload.new.special_note && payload.new.special_note.includes('Student Cancel:')) {
                const parts = payload.new.special_note.split('Student Cancel:')
                setCancellationAlert({
                  orderNumber: payload.new.order_number || 'Unknown',
                  reason: parts[1]?.trim() || 'No reason provided'
                })
                const { playShopAlarm } = require('@/store/shopOrdersStore')
                playShopAlarm() // Play alarm for cancellation too!
              }
            }

            const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
            const activeOrders = await getShopActiveOrders(sid)
            useShopOrdersStore.getState().setOrders(activeOrders)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${sid}` },
          (payload) => {
            const wasOpen = shopIsOpen
            const isNowOpen = payload.new.is_open
            setShopIsOpen(isNowOpen)
            
            if (wasOpen === true && isNowOpen === false) {
              // Shop just closed — warn the owner but keep all in-flight orders intact!
              toast('🔒 Shop closed for new orders. All existing in-progress orders will continue normally.', {
                duration: 8000,
                style: { background: '#1e293b', color: '#f8fafc', fontWeight: 'bold' }
              })
            } else if (wasOpen === false && isNowOpen === true) {
              toast.success('✅ Shop is now open for new orders!', { duration: 4000 })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_items', filter: `partner_shop_id=eq.${sid}` },
          async (payload) => {
            // A partner order item was inserted! This means a new partner order has arrived.
            await new Promise(resolve => setTimeout(resolve, 500))
            const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
            const activeOrders = await getShopActiveOrders(sid)
            
            // Check if we actually got a new order that isn't in our state yet
            const currentOrders = useShopOrdersStore.getState().orders
            const newOrderCount = activeOrders.filter(ao => !currentOrders.some(co => co.id === ao.id)).length
            
            if (newOrderCount > 0) {
              useShopOrdersStore.getState().setOrders(activeOrders)
              const { playShopAlarm } = require('@/store/shopOrdersStore')
              playShopAlarm()
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [shopOwnerId, user?.id, setShopId, addOrder, updateOrderStatus, setLoading])

  // RELIABLE POLLING FALLBACK (5 seconds)
  // Bypasses any Supabase Realtime RLS subquery limitations and Next.js caching
  useEffect(() => {
    if (!shopOwnerId) return;
    let isMounted = true;
    
    const pollOrders = async () => {
      try {
        const { getShopActiveOrders } = await import('@/lib/supabase/queries/shop-dashboard')
        const currentSid = useShopOrdersStore.getState().shopId;
        if (!currentSid) return;
        
        // Fetch fresh data
        const activeOrders = await getShopActiveOrders(currentSid)
        if (!isMounted) return;
        
        const currentOrders = useShopOrdersStore.getState().orders
        
        // Detect if there are new orders that we missed via Realtime
        const newOrders = activeOrders.filter(ao => !currentOrders.some(co => co.id === ao.id && co.status === ao.status))
        
        if (newOrders.length > 0) {
          useShopOrdersStore.getState().setOrders(activeOrders)
          
          // If we see a completely new pending order, ring the alarm
          const hasNewPending = newOrders.some(no => no.status === 'pending' && !currentOrders.some(co => co.id === no.id));
          if (hasNewPending) {
            const { playShopAlarm } = require('@/store/shopOrdersStore')
            playShopAlarm()
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
  }, [shopOwnerId])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EFF6FF]">
        <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#2563EB] font-bold text-sm">Loading Shop Portal...</p>
      </div>
    )
  }

  const isLoginPage = pathname.includes('/login')
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isKDS ? 'bg-slate-900' : 'bg-[#EFF6FF]'} ${isAlarmRinging ? 'ringing-shop-container' : ''}`}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* 🔔 Sound Unlock Banner — critical for Android APK WebView audio */}
      <AnimatePresence>
        {!audioUnlocked && Capacitor.isNativePlatform() && !isLoginPage && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[200] bg-orange-500 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg cursor-pointer"
            onClick={() => {
              initShopAudio()
              setAudioUnlocked(true)
            }}
          >
            <Volume2 size={20} className="animate-pulse" />
            <span className="font-bold text-sm">TAP HERE to enable bell alarm sound</span>
            <Volume2 size={20} className="animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📱 APK Device Name Modal — shown on first APK launch */}
      <AnimatePresence>
        {showDeviceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Smartphone size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Name This Device</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Give this tablet/phone a name so you can identify it in the admin panel (e.g. "Amogha Counter Tablet")
                </p>
              </div>
              <input
                type="text"
                placeholder="e.g. Amogha Counter Tablet"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-900 font-medium mb-4"
                autoFocus
              />
              <button
                disabled={!deviceName.trim() || savingDevice}
                onClick={async () => {
                  if (!deviceName.trim() || !user?.id) return
                  setSavingDevice(true)
                  try {
                    localStorage.setItem('apk_device_name', deviceName.trim())
                    await fetch('/api/apk/register-device', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, deviceName: deviceName.trim() })
                    })
                    toast.success(`Device "${deviceName.trim()}" registered!`)
                    setShowDeviceModal(false)
                  } catch {
                    toast.error('Failed to save. Try again.')
                  } finally {
                    setSavingDevice(false)
                  }
                }}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 active:scale-95 transition"
              >
                {savingDevice ? 'Saving...' : 'Save Device Name'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAlarmRinging && (
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
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border-4 border-orange-500 ringing-shop-container"
            >
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 text-4xl animate-bounce">
                🔥
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">New Order Alert!</h2>
              <p className="text-gray-600 mb-6 text-sm">
                A new order has arrived. Please accept it to stop the alarm.
              </p>
              <button
                onClick={() => stopShopAlarm()}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition"
              >
                Accept & Stop Alarm
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Cancellation Alert Modal */}
      <AnimatePresence>
        {cancellationAlert && (
          <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-red-100 flex flex-col"
            >
              <div className="bg-red-600 p-6 flex flex-col items-center justify-center text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 border border-white/30 shadow-inner">
                  <ShieldAlert size={32} className="text-white drop-shadow-md" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-center leading-tight">Order Cancelled!</h3>
                <p className="text-red-100 font-medium text-center mt-2 opacity-90">Order #{cancellationAlert.orderNumber}</p>
              </div>
              <div className="p-8 flex flex-col gap-6">
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Cancellation Reason</p>
                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-2xl"></div>
                    <p className="text-base text-gray-800 font-medium pl-2">{cancellationAlert.reason}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCancellationAlert(null)
                    stopShopAlarm()
                  }}
                  className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/30 text-lg flex items-center justify-center gap-2"
                >
                  Confirm & Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {needsOnboarding && user && (
        <CompleteProfileOverlay 
          role="shop_owner" 
          userId={user.id} 
          needsShopCreation={needsShopCreation} 
          onComplete={() => {
            setNeedsOnboarding(false)
            window.location.reload()
          }} 
        />
      )}
      
      {/* Desktop Sidebar (Hide in KDS) */}
      {!isKDS && (
        <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto">
          <AdminImpersonationBanner />
          <ShopSidebar />
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto flex flex-col ${isKDS ? 'max-w-none p-0' : 'max-w-6xl pb-24 md:pb-8 pt-0'}`}>
        {!isKDS && (
          <div className="md:hidden">
            <AdminImpersonationBanner />
          </div>
        )}
        {isKDS ? children : (
          <div className="px-4 md:px-8 pt-4">
            {children}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav (Hide in KDS) */}
      {!isKDS && !isLoginPage && (
        <div className="md:hidden">
          <ShopBottomNav />
        </div>
      )}
      
      <FocusedOrderModal />
    </div>
  )
}
