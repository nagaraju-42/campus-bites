'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getRoleRedirect } from '@/lib/auth/redirect'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message || 'Google sign in failed')
      setIsGoogleLoading(false)
    }
  }

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

      toast.success('Welcome back! 👋')
      router.replace(getRoleRedirect(profile.role))
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Check credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto">
      <div className="bg-[#EAB308] px-6 pt-16 pb-10 rounded-b-3xl shadow-sm">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-gray-900">Welcome Back 👋</h1>
          <p className="text-yellow-900 mt-2 font-medium">Login to order your favourite food</p>
        </motion.div>
      </div>

      <motion.div
        className="flex-1 px-6 py-8 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-70"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-gray-400 text-xs font-bold uppercase">Or login with email</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
            />
          </div>
          <div className="relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-bold text-gray-800">Password</label>
              <Link href="/forgot-password" className="text-xs text-[#EAB308] font-bold hover:text-[#CA8A04] transition">
                Forgot?
              </Link>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <p className="text-center text-gray-600 text-sm pt-4 font-medium">
          New to DineNDeliver?{' '}
          <Link href="/register" className="text-[#CA8A04] font-bold hover:underline">Create Account</Link>
        </p>

        <div className="text-center mt-2">
          <Link href="/contact" className="text-xs text-gray-400 font-bold hover:text-gray-600 transition underline underline-offset-4">
            Need Help? Contact Support
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
