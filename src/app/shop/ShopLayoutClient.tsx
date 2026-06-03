'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import useSound from 'use-sound'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { getShopDetailsByOwner } from '@/lib/supabase/queries/shop-dashboard'
import ShopSidebar from '@/components/shop/ShopSidebar'
import ShopBottomNav from '@/components/shop/ShopBottomNav'
import AdminImpersonationBanner from '@/components/admin/AdminImpersonationBanner'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isKDS = pathname === '/shop/kds'
  
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const { setShopId, addOrder, updateOrderStatus } = useShopOrdersStore()
  const [shopOwnerId, setShopOwnerId] = useState<string | null>(null)

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
        if (shopData) {
          setShopId(shopData.id)
          
          // Fix: Fetch initial orders so they don't disappear on direct page load
          const { getShopActiveOrders } = require('@/lib/supabase/queries/shop-dashboard')
          const activeOrders = await getShopActiveOrders(shopData.id)
          console.log("DEBUG KDS ACTIVE ORDERS:", activeOrders)
          useShopOrdersStore.getState().setOrders(activeOrders)

          setupRealtime(shopData.id)
        } else {
          // AUTO-HEAL: If they are a shop owner but don't have a shop yet, create one for them instantly
          const supabase = createClient()
          const { data: newShop, error: autoCreateError } = await supabase
            .from('shops')
            .insert({
              owner_id: targetOwnerId,
              name: 'My New Shop',
              description: 'A newly registered shop',
              address: 'Campus',
              is_open: true
            })
            .select()
            .single()

          if (newShop) {
            setShopId(newShop.id)
            setupRealtime(newShop.id)
            toast.success("We automatically created a default shop for you!")
          } else {
            console.error("Auto-heal failed:", autoCreateError)
            toast.error("No shop found for your account. Please contact admin.")
          }
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

  // Hide sidebar on login page
  const isLoginPage = pathname === '/shop/login'

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isKDS ? 'bg-slate-900' : 'bg-[#EFF6FF]'}`}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      {/* Desktop Sidebar (Hide in KDS) */}
      {!isKDS && !isLoginPage && (
        <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white">
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
