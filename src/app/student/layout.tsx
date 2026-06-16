'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import StudentBottomNav from '@/components/student/StudentBottomNav'
import PWAInstallPrompt from '@/components/student/PWAInstallPrompt'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setStudentProfile, setLoading, isLoading, clearAuth } = useAuthStore()
  const [cancellationAlert, setCancellationAlert] = useState<{ orderNumber: string, reason: string } | null>(null)

  useEffect(() => {
    // Inject PWA manifest link into document head
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()
    
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.json'
    document.head.appendChild(link)

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', '#EAB308')

    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')
      const isRestrictedRoute = pathname.includes('/cart') || pathname.includes('/checkout') || pathname.includes('/orders') || pathname.includes('/profile') || pathname.includes('/track')

      if (!session) {
        clearAuth()
        setLoading(false)
        if (isRestrictedRoute) {
          router.replace('/student/login')
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'student') {
        clearAuth()
        setLoading(false)
        if (isRestrictedRoute) {
          router.replace('/student/login')
        }
        return
      }

      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setUser(profile)
      setStudentProfile(studentProfile)
      setLoading(false)

      if (!profile.phone || !studentProfile?.hostel_name) {
        if (isRestrictedRoute) {
          router.replace('/complete-profile')
        }
        return
      }
      
      // If they are on login page but already logged in, send to home
      if (isLoginRoute) {
        router.replace('/student/home')
      }
    }
    checkAuth()

    // Optimistic Realtime Broadcast Listener
    const supabase = createClient()
    const channel = supabase.channel('campus-broadcasts')
      .on('broadcast', { event: 'announcement' }, (payload) => {
        import('react-hot-toast').then(({ default: toast }) => {
          toast(payload.payload.message, {
            icon: '📢',
            duration: 15000,
            style: {
              borderRadius: '16px',
              background: '#FEFCE8',
              color: '#854D0E',
              border: '1px solid #FEF08A',
              fontWeight: 'bold'
            }
          })
        })
      })
      .subscribe()

    // Live Cart Sync: Listen for global menu_items changes
    const cartSyncChannel = supabase.channel('cart-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_items' }, (payload) => {
        const updatedItem = payload.new
        const { items, removeItem } = require('@/store/cartStore').useCartStore.getState()
        
        // Find if this item is in the cart
        const cartItemsForThisMenu = items.filter((i: any) => i.id === updatedItem.id)
        if (cartItemsForThisMenu.length === 0) return

        let wasRemoved = false

        // 1. If the item itself is globally disabled or archived
        if (updatedItem.is_available === false || updatedItem.is_archived === true) {
          cartItemsForThisMenu.forEach((i: any) => {
            removeItem(i.id, i.variantName)
            wasRemoved = true
          })
        } 
        // 2. Or if a specific variant in the cart is now disabled
        else if (updatedItem.variants && Array.isArray(updatedItem.variants)) {
          cartItemsForThisMenu.forEach((i: any) => {
            if (i.variantName) {
              const variantObj = updatedItem.variants.find((v: any) => v.name === i.variantName)
              if (variantObj && variantObj.is_available === false) {
                removeItem(i.id, i.variantName)
                wasRemoved = true
              }
            }
          })
        }

        if (wasRemoved) {
          import('react-hot-toast').then(({ default: toast }) => {
            toast.error(`Oops! "${updatedItem.name}" just went out of stock and was removed from your cart.`, {
              icon: '🛒',
              duration: 5000,
            })
          })
        }
      })
      .subscribe()

    // Global Cancel Alert Listener for Student
    let ordersChannel: any;
    if (user?.id) {
      ordersChannel = supabase.channel(`student-orders-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `student_id=eq.${user.id}` },
          (payload) => {
            if (payload.new.status === 'cancelled' && payload.old.status !== 'cancelled') {
              if (payload.new.special_note && payload.new.special_note.includes('Shop Cancel:')) {
                const parts = payload.new.special_note.split('Shop Cancel:')
                setCancellationAlert({
                  orderNumber: payload.new.order_number || 'Unknown',
                  reason: parts[1]?.trim() || 'No reason provided'
                })
              }
            }
          }
        )
        .subscribe()
    }

    return () => { 
      supabase.removeChannel(channel)
      supabase.removeChannel(cartSyncChannel)
      if (ordersChannel) supabase.removeChannel(ordersChannel)
    }
  }, [router, pathname, setUser, setStudentProfile, setLoading, user?.id])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-purple-600 font-medium text-sm">Loading DineNDeliver...</p>
        </div>
      </div>
    )
  }

  const hideNav = pathname.includes('/track') || pathname.includes('/checkout')

  return (
    <div className="relative min-h-screen bg-gray-50">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <PWAInstallPrompt />
      {children}
      {!hideNav && <StudentBottomNav />}

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
                  onClick={() => setCancellationAlert(null)}
                  className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/30 text-lg flex items-center justify-center gap-2"
                >
                  Confirm & Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
