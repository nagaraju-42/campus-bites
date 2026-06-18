'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RiderRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || formData.full_name.length < 3) {
      toast.error('Enter your full name (min 3 characters)')
      return
    }
    if (formData.phone.length !== 10) {
      toast.error('Enter a valid 10-digit phone number')
      return
    }
    if (!formData.email.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'rider',
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Registration failed')

      // Ensure profile has phone number
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone: formData.phone })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Failed to update phone number:', profileError)
      }

      toast.success('Account created! Welcome to the team 🛵')
      router.replace('/rider2/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex flex-col justify-center px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-md mx-auto"
      >
        <div className="bg-[#16A34A] px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🛵</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">
            Join the Fleet
          </h1>
          <p className="text-green-100 mt-1 font-medium text-xs">Create your rider account</p>
        </div>

        <form onSubmit={handleRegister} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Full Name</label>
            <input
              type="text"
              name="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Phone Number</label>
            <input
              type="tel"
              name="phone"
              placeholder="10-digit number"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="rider@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirm_password"
              placeholder="Confirm your password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:bg-white shadow-sm transition font-medium text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#16A34A] text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-200 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
          
          <div className="text-center pt-2">
            <p className="text-sm font-medium text-gray-500">
              Already have an account?{' '}
              <Link href="/rider2/login" className="text-[#16A34A] hover:underline font-bold">
                Log In
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
