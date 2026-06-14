'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRoleRedirect } from '@/lib/auth/redirect'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const searchSuffix = typeof window !== 'undefined' ? window.location.search : ''

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          router.replace(`${getRoleRedirect(profile.role)}${searchSuffix}`)
          return
        }
      }
      
      // If no session or profile, default redirect to student home
      router.replace(`/student/home${searchSuffix}`)
    }
    checkSession()
  }, [router])

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col items-center justify-between px-6 py-12 max-w-[430px] mx-auto relative overflow-hidden">
      
      {/* Faint Background Buildings pattern could go here, simulating the image */}
      <div className="absolute bottom-40 left-0 w-full h-48 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

      {/* Header */}
      <motion.div
        className="text-center mt-12 z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* Mock Logo Icon to match image */}
          <div className="w-8 h-8 rounded-full border-2 border-[#EAB308] flex flex-col items-center justify-center">
            <div className="w-4 h-1.5 bg-[#EAB308] rounded-t-full mb-0.5"></div>
            <div className="w-5 h-1 bg-[#EAB308] rounded-sm"></div>
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight">Campus<span className="text-[#EAB308]">Bites</span></h1>
        <p className="text-gray-600 mt-3 text-sm font-medium px-4">
          Good food, delivered<br />to your hostel.
        </p>
      </motion.div>

      {/* Hero Illustration */}
      <motion.div
        className="flex-1 flex items-center justify-center my-8 w-full z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Placeholder for the delivery scooter illustration */}
          <div className="absolute inset-0 bg-[#FEF08A] rounded-full opacity-40 blur-2xl"></div>
          <span className="text-9xl relative z-10 drop-shadow-xl">🛵</span>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        className="w-full space-y-4 mb-4 z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Link href="/register" className="block w-full">
          <button className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl text-base shadow-lg shadow-yellow-200 hover:bg-[#CA8A04] transition-all duration-200 active:scale-95">
            Get Started
          </button>
        </Link>
        <Link href="/login" className="block w-full">
          <button className="w-full bg-white border-2 border-[#EAB308] text-gray-900 font-bold py-4 rounded-xl text-base shadow-sm hover:bg-gray-50 transition-all duration-200 active:scale-95">
            Login
          </button>
        </Link>
        <p className="text-center text-gray-400 text-xs mt-6 font-medium">
          Made for students, by students ❤️
        </p>
      </motion.div>
    </div>
  )
}
