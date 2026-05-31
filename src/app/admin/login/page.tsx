'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Enter credentials')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw new Error('Profile error: ' + profileError.message)
      if (!profile) throw new Error('Profile not found in database')

      // Block non-admins
      if (profile.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Access denied. Administrator clearance required.')
      }

      toast.success('Admin clearance granted.')
      router.replace('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1E293B] rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50"
      >
        <div className="p-8 pb-6 border-b border-slate-700/50 flex flex-col items-center">
          <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center text-[#F97316] mb-4">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-display font-bold text-white text-center">
            System Authentication
          </h1>
          <p className="text-slate-400 mt-2 font-medium text-sm text-center">
            Restricted Access Zone
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Identifier</label>
            <input
              type="email"
              placeholder="admin@campusbites.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] shadow-inner transition font-mono text-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Passphrase</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] shadow-inner transition font-mono text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-9 text-slate-500 hover:text-slate-300 transition">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F97316] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-orange-500/20"
            >
              {isLoading ? 'Verifying...' : 'Initialize Session'}
            </button>
          </div>

          <div className="text-center mt-4 pb-2">
            <a href="/contact" className="text-xs text-slate-500 font-bold hover:text-slate-300 transition underline underline-offset-4">
              System Issue? Contact Support
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
