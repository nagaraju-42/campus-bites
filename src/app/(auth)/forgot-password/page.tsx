'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Enter your email address')
      return
    }
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }
      
      setIsSent(true)
      toast.success('4-digit temporary password sent to your email!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto">
      <div className="bg-[#EAB308] px-6 pt-16 pb-10 rounded-b-3xl shadow-sm">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-gray-900">Forgot Password</h1>
          <p className="text-yellow-900 mt-2 font-medium">Get a temporary 4-digit password</p>
        </motion.div>
      </div>

      <motion.div
        className="flex-1 px-6 py-8 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isSent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <h3 className="font-bold text-green-800 text-lg mb-2">Email Sent!</h3>
            <p className="text-green-700 text-sm mb-4">
              We've sent a 4-digit temporary password to <strong>{email}</strong>. 
              Please check your inbox (and spam folder).
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#EAB308] text-gray-900 font-bold py-3.5 rounded-xl hover:bg-[#CA8A04] transition-all shadow-sm"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-transparent bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] shadow-sm transition"
              />
              <p className="text-xs text-gray-500 mt-2">
                We will instantly generate a new 4-digit password and send it to your email.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm text-gray-500 font-bold hover:text-gray-700 transition">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
