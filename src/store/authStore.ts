import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  role: string
  full_name: string
  phone: string | null
  email: string
  avatar_url: string | null
}

interface StudentProfile {
  college_name: string
  hostel_name: string
  room_number: string
  block?: string
  floor?: string
}

interface AuthState {
  user: UserProfile | null
  adminUser: UserProfile | null
  studentProfile: StudentProfile | null
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  setAdminUser: (user: UserProfile | null) => void
  setStudentProfile: (profile: StudentProfile | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      adminUser: null,
      studentProfile: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setAdminUser: (adminUser) => set({ adminUser }),
      setStudentProfile: (profile) => set({ studentProfile: profile }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearAuth: () => set({ user: null, studentProfile: null, adminUser: null }),
    }),
    {
      name: 'campus-bites-auth',
      partialize: (state) => ({ user: state.user, studentProfile: state.studentProfile, adminUser: state.adminUser }),
    }
  )
)
