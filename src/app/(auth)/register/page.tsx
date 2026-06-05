'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { RegisterFormData } from '@/types'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient()
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
      if (data && data.value) {
        try {
          setDeliveryLocations(JSON.parse(data.value))
        } catch(e) {}
      }
    }
    loadSettings()
  }, [])

  const [formData, setFormData] = useState<RegisterFormData>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    college_name: '',
    hostel_name: '',
    room_number: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

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

  const handleRegister = async () => {
    if (!formData.full_name || formData.full_name.length < 3) {
      toast.error('Enter your full name (min 3 characters)')
      return
    }
    if (!formData.email.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    if (formData.phone.length !== 10) {
      toast.error('Enter a valid 10-digit phone number')
      return
    }
    if (!formData.hostel_name) {
      toast.error('Please select your Preset Delivery Location')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
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
            role: 'student',
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Registration failed')

      await supabase
        .from('profiles')
        .update({ phone: formData.phone })
        .eq('id', data.user.id)

      await supabase.from('student_profiles').insert({
        id: data.user.id,
        college_name: 'Campus',
        hostel_name: formData.hostel_name,
        room_number: formData.room_number || 'N/A',
      })

      toast.success('Account created! Welcome to TapNosh 🎉')
      router.replace('/student/home')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto pb-10">
      {/* Header */}
      <div className="bg-[#EAB308] px-6 pt-12 pb-8 rounded-b-3xl shadow-sm">
        <h1 className="text-2xl font-display font-bold text-gray-900">Create Account</h1>
        <p className="text-yellow-900 text-sm font-medium">Join us for delicious meals</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-70"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-gray-400 text-xs font-bold uppercase">Or register with email</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <InputField label="Full Name" name="full_name" type="text"
          placeholder="Ravi Kumar" value={formData.full_name} onChange={handleChange} />
        
        <InputField label="Email Address" name="email" type="email"
          placeholder="ravi@student.au.edu.in" value={formData.email} onChange={handleChange} />
        
        <InputField label="Phone Number" name="phone" type="tel"
          placeholder="9876543210" value={formData.phone} onChange={handleChange} />

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Preset Delivery Location *</label>
          <select
            name="hostel_name"
            value={formData.hostel_name}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 focus:outline-none focus:border-[#EAB308] focus:ring-0 shadow-sm transition-all"
          >
            <option value="" disabled>Select your location</option>
            {deliveryLocations.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <InputField 
          label="Room / Block Number (Optional)" 
          name="room_number" 
          type="text"
          placeholder="e.g. Room 312, Floor 3" 
          value={formData.room_number} 
          onChange={handleChange} 
        />

        <div className="relative pt-2">
          <InputField label="Password" name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 characters" value={formData.password} onChange={handleChange} />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-[46px] text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        
        <InputField label="Confirm Password" name="confirm_password"
          type="password" placeholder="Re-enter password"
          value={formData.confirm_password} onChange={handleChange} />

        <div className="pt-4 space-y-4">
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70"
          >
            {isLoading ? 'Creating Account...' : 'Create Account 🎉'}
          </button>
          
          <p className="text-center text-gray-600 text-sm font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-[#CA8A04] font-bold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, name, type, placeholder, value, onChange }: {
  label: string; name: string; type: string
  placeholder: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:ring-0 shadow-sm transition-all"
      />
    </div>
  )
}
