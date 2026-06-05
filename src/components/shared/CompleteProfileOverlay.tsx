'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Store, CheckCircle2 } from 'lucide-react'
import { updateProfilePhone, createShopProfile } from '@/lib/supabase/queries/shop-dashboard'
import toast from 'react-hot-toast'

type Props = {
  role: 'shop_owner' | 'rider'
  userId: string
  needsShopCreation?: boolean
  onComplete: () => void
}

export default function CompleteProfileOverlay({ role, userId, needsShopCreation, onComplete }: Props) {
  const [phone, setPhone] = useState('')
  const [shopName, setShopName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate phone (10 digits)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.')
      return
    }

    if (needsShopCreation && shopName.trim().length < 3) {
      toast.error('Shop name must be at least 3 characters long.')
      return
    }

    setIsLoading(true)
    try {
      const { updateUserProfilePhoneAction } = await import('@/app/actions/profile')
      
      await updateUserProfilePhoneAction(
        userId,
        `+91${phoneDigits}`,
        role,
        needsShopCreation ? shopName.trim() : undefined
      )

      toast.success('Profile completed successfully!')
      onComplete()
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-500" />
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
            {role === 'shop_owner' ? <Store size={32} /> : <CheckCircle2 size={32} />}
          </div>
        </div>

        <h2 className="text-2xl font-display font-bold text-gray-900 text-center mb-2">
          Complete Your Profile
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          {role === 'shop_owner' 
            ? 'We need a few details to get your shop running and ready for orders.'
            : 'Please provide your contact number before accepting deliveries.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {needsShopCreation && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Shop Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Store size={18} />
                </div>
                <input 
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Raju's Cafe"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Phone size={18} />
              </div>
              <input 
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition font-mono tracking-wider"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Used for {role === 'shop_owner' ? 'student inquiries and order updates' : 'customer communication during delivery'}.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || phone.length !== 10 || (needsShopCreation && shopName.length < 3)}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? 'Saving...' : 'Complete Profile & Continue'}
          </button>
        </form>

      </motion.div>
    </div>
  )
}
