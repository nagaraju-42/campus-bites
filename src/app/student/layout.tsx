'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import StudentBottomNav from '@/components/student/StudentBottomNav'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, setStudentProfile, setLoading, isLoading, clearAuth } = useAuthStore()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const isLoginRoute = pathname.includes('/login')

      if (!session) {
        clearAuth()
        setLoading(false)
        if (!isLoginRoute) {
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
        setLoading(false)
        if (!isLoginRoute) {
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

    return () => { supabase.removeChannel(channel) }
  }, [router, pathname, setUser, setStudentProfile, setLoading])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-purple-600 font-medium text-sm">Loading CampusBites...</p>
        </div>
      </div>
    )
  }

  const hideNav = pathname.includes('/track') || pathname.includes('/checkout')

  return (
    <div className="relative min-h-screen bg-gray-50">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {children}
      {!hideNav && <StudentBottomNav />}
    </div>
  )
}
