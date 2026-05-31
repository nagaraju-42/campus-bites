'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getRoleRedirect } from '@/lib/auth/redirect'

export default function ShopLoginPage() {
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

      // Block students from accessing shop portal
      if (profile.role === 'student') {
        await supabase.auth.signOut()
        throw new Error('Access denied. Student accounts cannot access the shop portal.')
      }

      toast.success('Welcome back to CampusShop! 👋')
      router.replace('/shop/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Check credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="bg-[#2563EB] px-8 pt-10 pb-8 text-center">
          <h1 className="text-3xl font-display font-bold text-white">
            Campus<span className="text-blue-200">Shop</span>
          </h1>
          <p className="text-blue-100 mt-2 font-medium text-sm">Partner & Kitchen Portal</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="shop@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:bg-white shadow-sm transition"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:bg-white shadow-sm transition"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2563EB] text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Logging in...' : 'Secure Login'}
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
