'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, MessageSquare, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'student', // default
    issue: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [tickets, setTickets] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'tickets'>('form')

  useEffect(() => {
    async function loadTickets() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.id) {
        setUserId(session.user.id)
        
        // Fetch tickets
        const { data } = await supabase
          .from('contact_messages')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          
        if (data) setTickets(data)

        // Realtime Listener for their tickets
        // Add random string to avoid React Strict Mode channel name collisions
        const channelName = `user-tickets-${session.user.id}-${Math.random()}`
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'contact_messages', filter: `user_id=eq.${session.user.id}` },
            (payload) => {
              setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
              if (payload.new.status === 'resolved') {
                toast.success('Admin has resolved your ticket!', { icon: '🎉' })
              }
            }
          )
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      }
    }
    loadTickets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.phone || !formData.issue) {
      toast.error('Please fill out all fields')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('contact_messages')
        .insert({
          user_id: userId, // Might be null if guest
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          issue: formData.issue,
          status: 'unread'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Message sent to Admin successfully!')
      setFormData({ ...formData, issue: '' }) // Clear issue
      
      if (data && userId) {
        setTickets([data, ...tickets])
        setActiveTab('tickets')
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message. Database might be blocking it.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFCE8] flex flex-col max-w-[430px] mx-auto md:max-w-2xl pb-24">
      <div className="bg-[#EAB308] px-6 pt-16 pb-6 rounded-b-3xl shadow-sm relative">
        <button 
          onClick={() => router.back()} 
          className="absolute top-12 left-5 p-2 bg-yellow-600/30 rounded-full text-yellow-900 hover:bg-yellow-600/50 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center mt-4">
          <h1 className="text-3xl font-display font-bold text-gray-900">Contact Support</h1>
          <p className="text-yellow-900 mt-2 font-medium">We're here to help you</p>
        </div>
        
        {userId && (
          <div className="flex bg-white/20 p-1 rounded-xl mt-6">
            <button 
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'form' ? 'bg-white text-[#EAB308] shadow-sm' : 'text-yellow-900 hover:bg-white/10'}`}
            >
              New Ticket
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'tickets' ? 'bg-white text-[#EAB308] shadow-sm' : 'text-yellow-900 hover:bg-white/10'}`}
            >
              My Tickets ({tickets.length})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'form' ? (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit} 
              className="space-y-5 bg-white p-6 rounded-3xl shadow-sm border border-yellow-50"
            >
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:bg-white transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:bg-white transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
                  maxLength={10}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">I am a...</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#EAB308] focus:bg-white transition appearance-none"
                >
                  <option value="student">Student (Customer)</option>
                  <option value="rider">Delivery Partner</option>
                  <option value="shop">Shop Owner</option>
                  <option value="other">Other / Guest</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Describe your issue</label>
                <textarea
                  placeholder="What do you need help with?"
                  value={formData.issue}
                  onChange={(e) => setFormData({...formData, issue: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#EAB308] focus:bg-white transition h-32 resize-none"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#EAB308] text-gray-900 font-bold py-4 rounded-xl hover:bg-[#CA8A04] transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send size={18} /> Send to Admin
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {tickets.length === 0 ? (
                <div className="text-center bg-white p-10 rounded-3xl border border-yellow-100">
                  <p className="text-4xl mb-4">💬</p>
                  <p className="font-bold text-gray-900">No tickets yet.</p>
                </div>
              ) : (
                tickets.map(ticket => (
                  <div key={ticket.id} className="bg-white p-5 rounded-3xl shadow-sm border border-yellow-50 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${ticket.status === 'resolved' ? 'bg-[#16A34A]' : 'bg-red-500'}`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase">Ticket ID: {ticket.id.substring(0,6)}</p>
                      {ticket.status === 'resolved' ? (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                          <CheckCircle2 size={12} /> Resolved
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                          Pending Admin
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 text-sm font-medium mb-3">{ticket.issue}</p>
                    <p className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
