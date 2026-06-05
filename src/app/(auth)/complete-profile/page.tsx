'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { updateProfileServer } from './actions'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, setUser, setStudentProfile } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isCustomAddress, setIsCustomAddress] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    hostel_name: '',
    room_number: '',
  })

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.replace('/login')
        return
      }

      setFormData(prev => ({ ...prev, full_name: session.user.user_metadata?.full_name || '' }))

      // Check if profile already completed
      const { data: profile } = await supabase.from('profiles').select('phone').eq('id', session.user.id).single()
      const { data: student } = await supabase.from('student_profiles').select('hostel_name').eq('id', session.user.id).single()

      if (profile?.phone && student?.hostel_name) {
        router.replace('/student/home') // Already completed
      }

      // Load locations
      const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
      if (settings && settings.value) {
        try {
          setDeliveryLocations(JSON.parse(settings.value))
        } catch(e) {}
      }
    }
    init()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || formData.full_name.length < 3) {
      toast.error('Enter your full name')
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

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: formData.full_name, role: 'student' }
      })

      // Use Server Action to bypass RLS policies and ensure DB updates
      await updateProfileServer(
        currentUser.id,
        formData.full_name,
        formData.phone,
        formData.hostel_name,
        formData.room_number || 'N/A'
      )

      // Update Zustand
      setUser({
        id: currentUser.id,
        email: currentUser.email!,
        role: 'student',
        full_name: formData.full_name,
        phone: formData.phone,
        avatar_url: currentUser.user_metadata?.avatar_url || ''
      })
      setStudentProfile({
        college_name: 'Campus',
        hostel_name: formData.hostel_name,
        room_number: formData.room_number || 'N/A'
      })

      toast.success('Profile completed successfully!')
      // Force a full page reload to ensure layout fetches fresh data
      window.location.href = '/student/home'
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto pb-10">
      <div className="bg-[#EAB308] px-6 pt-16 pb-10 rounded-b-3xl shadow-sm">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-gray-900">Almost there!</h1>
          <p className="text-yellow-900 mt-2 font-medium">Please complete your profile to continue.</p>
        </motion.div>
      </div>

      <motion.div
        className="flex-1 px-6 py-8 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Phone Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="9876543210"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-bold text-gray-800">
              {isCustomAddress ? 'Custom Delivery Location *' : 'Preset Delivery Location *'}
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomAddress(!isCustomAddress)
                setFormData({ ...formData, hostel_name: '' })
              }}
              className="text-xs font-bold text-[#CA8A04] hover:text-yellow-800 transition"
            >
              {isCustomAddress ? 'Choose Preset' : 'Enter Custom Address'}
            </button>
          </div>
          
          {isCustomAddress ? (
            <input
              type="text"
              name="hostel_name"
              placeholder="e.g. My Custom Block"
              value={formData.hostel_name}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:ring-0 shadow-sm transition-all"
            />
          ) : (
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
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1.5">Room / Block Number (Optional)</label>
          <input
            type="text"
            name="room_number"
            placeholder="e.g. Room 312"
            value={formData.room_number}
            onChange={handleChange}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70"
          >
            {isLoading ? 'Saving...' : 'Complete Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
