'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner } from '@/lib/supabase/queries/shop-dashboard'
import ShopSidebar from '@/components/shop/ShopSidebar'
import ShopBottomNav from '@/components/shop/ShopBottomNav'
import AdminImpersonationBanner from '@/components/admin/AdminImpersonationBanner'
import CompleteProfileOverlay from '@/components/shared/CompleteProfileOverlay'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isKDS = pathname === '/shop/kds'
  
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setShopId, addOrder, updateOrderStatus } = useShopOrdersStore()
  const [shopOwnerId, setShopOwnerId] = useState<string | null>(null)
  
  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [needsShopCreation, setNeedsShopCreation] = useState(false)
  
  // Track shop open status for mid-session closure warning
  const [shopIsOpen, setShopIsOpen] = useState<boolean | null>(null)
  const [shopIdForWatch, setShopIdForWatch] = useState<string | null>(null)

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
            // Poll up to 5 times (2.5 seconds) to ensure order_items are inserted
            let fullOrder;
            for (let i = 0; i < 5; i++) {
              await new Promise(resolve => setTimeout(resolve, 500))
              const { data } = await supabase
                .from('orders')
                .select(`*, order_items(*)`)
                .eq('id', payload.new.id)
                .single()
              
              fullOrder = data;
              if (fullOrder && fullOrder.order_items && fullOrder.order_items.length > 0) {
                break;
              }
            }

            if (fullOrder) {
              addOrder(fullOrder)
              // Play loud alarm for KDS
              const { playShopAlarm } = require('@/store/shopOrdersStore')
              playShopAlarm()
              
              toast.success(`New order received: ${fullOrder.order_number}`, { 
                id: `order-${fullOrder.id}`, 
                icon: '🔔', 
                duration: 45000 
              })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `shop_id=eq.${sid}` },
          (payload) => {
            updateOrderStatus(payload.new.id, payload.new.status)
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
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [shopOwnerId, user?.id, setShopId, addOrder, updateOrderStatus, setLoading])

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
    <div className={`min-h-screen flex flex-col md:flex-row ${isKDS ? 'bg-slate-900' : 'bg-[#EFF6FF]'}`}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
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
    </div>
  )
}
