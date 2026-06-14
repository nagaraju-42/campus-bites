'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Wrench, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Ticket form state
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const supabase = createClient()
        
        // 1. Check if user is admin
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
            setIsAdmin(true)
          }
        }

        // 2. Check maintenance mode
        const { data: settings, error } = await supabase
          .from('app_settings')
          .select('maintenance_mode')
          .limit(1)
          .single()

        if (!error && settings?.maintenance_mode === true) {
          setIsMaintenance(true)
        }

        // 3. Listen for real-time changes so we can kick people out instantly or let them back in
        const channel = supabase
          .channel('maintenance_check')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'app_settings' },
            (payload) => {
              if (payload.new.maintenance_mode === true) {
                setIsMaintenance(true)
              } else {
                setIsMaintenance(false)
              }
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }

      } catch (err) {
        console.error("Maintenance check failed:", err)
      } finally {
        setIsLoading(false)
      }
    }

    checkMaintenance()
  }, [])

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !message.trim()) {
      toast.error("Please fill in both email and message.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('support_tickets')
        .insert({ email, message })

      if (error) throw error

      setIsSubmitted(true)
      toast.success("Ticket submitted successfully!")
    } catch (err) {
      toast.error("Failed to submit ticket. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If loading, just show children to prevent flicker for normal users, or show loading state
  // But to be secure, we could show a loader. Let's just show a quick spinner if we want, 
  // or return children if not loading, to avoid flash.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFCE8]">
        <div className="w-12 h-12 border-4 border-[#EAB308] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If maintenance mode is ON and user is NOT an admin, block the entire app
  if (isMaintenance && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans text-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-lg w-full relative z-10"
        >
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
            <Wrench size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Under Maintenance</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            DineNDeliver is currently undergoing scheduled maintenance to improve your experience. We will be back online shortly. Please do not refresh.
          </p>

          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-4 text-left">Need emergency support?</h2>
            
            {isSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 flex flex-col items-center"
              >
                <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                <p className="text-emerald-400 font-medium">Ticket submitted!</p>
                <p className="text-emerald-500/70 text-sm mt-1">Our team will contact you soon.</p>
              </motion.div>
            ) : (
              <form onSubmit={submitTicket} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                    placeholder="student@campus.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Describe your issue..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={18} />
                  {isSubmitting ? 'Sending...' : 'Submit Support Ticket'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // If maintenance is OFF, or user IS an admin, render the normal app!
  return (
    <>
      {isMaintenance && isAdmin && (
        <div className="bg-red-600 text-white text-center py-1 text-xs font-bold tracking-wider fixed top-0 w-full z-[9999] opacity-90 pointer-events-none">
          ⚠️ MAINTENANCE MODE IS CURRENTLY ACTIVE (Only Admins can see the site)
        </div>
      )}
      {children}
    </>
  )
}
