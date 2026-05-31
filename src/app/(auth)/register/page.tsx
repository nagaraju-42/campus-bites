'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { RegisterFormData } from '@/types'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateStep1 = (): boolean => {
    if (!formData.full_name || formData.full_name.length < 3) {
      toast.error('Enter your full name (min 3 characters)')
      return false
    }
    if (!formData.email.includes('@')) {
      toast.error('Enter a valid email address')
      return false
    }
    if (formData.phone.length !== 10) {
      toast.error('Enter a valid 10-digit phone number')
      return false
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return false
    }
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) setStep(2)
  }

  const handleRegister = async () => {
    if (!formData.college_name || !formData.hostel_name || !formData.room_number) {
      toast.error('Please fill all hostel details')
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
        college_name: formData.college_name,
        hostel_name: formData.hostel_name,
        room_number: formData.room_number,
      })

      toast.success('Account created! Welcome to CampusBites 🎉')
      router.replace('/student/home')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-[#EAB308] px-6 pt-12 pb-8 rounded-b-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="text-gray-900 bg-white/30 p-1.5 rounded-full hover:bg-white/50 transition">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Create Account</h1>
            <p className="text-yellow-900 text-sm font-medium">Step {step} of 2</p>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-yellow-600/30 rounded-full h-1.5 mt-2">
          <div
            className="bg-gray-900 rounded-full h-1.5 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <InputField label="Full Name" name="full_name" type="text"
                placeholder="Ravi Kumar" value={formData.full_name} onChange={handleChange} />
              <InputField label="Email Address" name="email" type="email"
                placeholder="ravi@student.au.edu.in" value={formData.email} onChange={handleChange} />
              <InputField label="Phone Number" name="phone" type="tel"
                placeholder="9876543210" value={formData.phone} onChange={handleChange} />
              <div className="relative">
                <InputField label="Password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters" value={formData.password} onChange={handleChange} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-9 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <InputField label="Confirm Password" name="confirm_password"
                type="password" placeholder="Re-enter password"
                value={formData.confirm_password} onChange={handleChange} />
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <p className="text-gray-600 text-sm mb-4 font-medium">
                These details help restaurants deliver to you faster 🏠
              </p>
              <InputField label="College Name" name="college_name" type="text"
                placeholder="Anurag University" value={formData.college_name} onChange={handleChange} />
              <InputField label="Hostel Name" name="hostel_name" type="text"
                placeholder="Boys Hostel Block A" value={formData.hostel_name} onChange={handleChange} />
              <InputField label="Room Number" name="room_number" type="text"
                placeholder="Room 203" value={formData.room_number} onChange={handleChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Button */}
      <div className="px-6 pb-8 space-y-4">
        {step === 1 ? (
          <button
            onClick={handleNextStep}
            className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#CA8A04] transition-all shadow-md active:scale-95"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70"
          >
            {isLoading ? 'Creating Account...' : 'Create Account 🎉'}
          </button>
        )}
        <p className="text-center text-gray-600 text-sm font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-[#CA8A04] font-bold hover:underline">Login</Link>
        </p>
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
