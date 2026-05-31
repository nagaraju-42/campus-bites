'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setLoading, isLoading } = useAuthStore()

  // Auth Guard
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')

      if (!session) {
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

  if (isLoading) {
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
    <div className="min-h-screen bg-[#0F172A] text-slate-50 flex font-sans">
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1E293B', color: '#fff' } }} />
      
      {!isLoginPage && (
        <div className="w-64 flex-shrink-0 border-r border-slate-800 bg-[#0F172A]">
          <AdminSidebar />
        </div>
      )}

      <main className={`flex-1 ${!isLoginPage ? 'p-8 h-screen overflow-y-auto' : ''}`}>
        {children}
      </main>
    </div>
  )
}
