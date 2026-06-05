'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RiderLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Enter your email and password')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (!profile) throw new Error('Profile not found')

      // Block non-riders
      if (profile.role !== 'rider' && profile.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Access denied. This portal is for delivery partners only.')
      }

      toast.success('Ready to ride! 🛵')
      router.replace('/rider2/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Check credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex flex-col justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="bg-[#16A34A] px-8 pt-10 pb-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🛵</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">
            Campus<span className="text-green-200">Delivery</span>
          </h1>
          <p className="text-green-100 mt-1 font-medium text-xs">Rider Partner Portal</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="rider@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#16A34A] text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-200 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Connecting...' : 'Go Online'}
            </button>
          </div>

          <div className="text-center mt-4">
            <a href="/contact" className="text-xs text-gray-400 font-bold hover:text-gray-600 transition underline underline-offset-4">
              Need Help? Contact Support
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
