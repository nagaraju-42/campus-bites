'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import AdminSidebar from '@/components/admin/AdminSidebar'

import { Menu } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setLoading, isLoading, clearAuth } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Auth Guard
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')

      if (!session) {
        clearAuth()
        setLoading(false)
        if (!isLoginRoute) {
          router.replace('/admin/login')
        }
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !profile || profile.role !== 'admin') {
        // Strict blocking
        setLoading(false)
        if (!isLoginRoute) {
          router.replace('/admin/login')
        }
        return
      }

      setUser(profile)
      setLoading(false)
      
      // If they are on login page but already logged in as admin, send to dashboard
      if (isLoginRoute) {
        router.replace('/admin/dashboard')
      }
    }
    checkAuth()
  }, [router, pathname, setUser, setLoading])

  // Global Audio Unlock & Realtime Subscription for Admins
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [isAlarmRinging, setIsAlarmRinging] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    // Unlock audio on first interaction
    const unlockAudio = async () => {
      if (!audioUnlocked) {
        const { initShopAudio } = await import('@/store/shopOrdersStore')
        initShopAudio()
        setAudioUnlocked(true)
        window.removeEventListener('click', unlockAudio)
        window.removeEventListener('touchstart', unlockAudio)
      }
    }
    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)

    // Setup global realtime subscription for all orders
    const supabase = createClient()
    const channel = supabase.channel('admin-global-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('Admin received global new order!', payload)
          const { playShopAlarm } = await import('@/store/shopOrdersStore')
          playShopAlarm()
          setIsAlarmRinging(true)
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
      supabase.removeChannel(channel)
    }
  }, [user, audioUnlocked])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A]">
        <div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#F97316] font-bold text-sm">Verifying Admin Access...</p>
      </div>
    )
  }

  // Hide sidebar on login page
  const isLoginPage = pathname === '/admin/login'

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-50 flex flex-col md:flex-row font-sans overflow-x-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1E293B', color: '#fff' } }} />
      
      {!isLoginPage && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] border-b border-slate-800 z-30">
            <h1 className="text-xl font-display font-bold text-white tracking-wide">
              DineNDeliver<span className="text-[#F97316]">Admin</span>
            </h1>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-300 hover:text-white"
            >
              <Menu size={28} />
            </button>
          </div>

          {/* Off-canvas overlay */}
          {isSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Drawer */}
          <div className={`fixed md:relative inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out bg-[#0F172A] border-r border-slate-800 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
            <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      <main className={`flex-1 flex flex-col ${!isLoginPage ? 'h-screen md:h-screen overflow-y-auto' : ''}`}>
        <div className={!isLoginPage ? 'p-4 md:p-8 flex-1' : ''}>
          {children}
        </div>
      </main>

      {/* Admin Global Alarm UI */}
      {isAlarmRinging && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#1E293B] rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border-4 border-orange-500">
            <div className="w-20 h-20 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mb-4 text-4xl animate-bounce">
              🔥
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Platform Order Alert!</h2>
            <p className="text-slate-300 mb-6 text-sm">
              A new order was placed on the platform.
            </p>
            <button
              onClick={async () => {
                setIsAlarmRinging(false)
                const { stopShopAlarm } = await import('@/store/shopOrdersStore')
                stopShopAlarm()
              }}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition"
            >
              Stop Alarm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
