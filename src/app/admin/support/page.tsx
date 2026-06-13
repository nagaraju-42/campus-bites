'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Phone, Mail, User as UserIcon, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface ContactMessage {
  id: string
  user_id: string | null
  name: string
  email: string
  phone: string
  role: string
  issue: string
  status: 'unread' | 'resolved'
  created_at: string
  is_emergency?: boolean
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMessages()

    const channelName = `admin-support-inbox-${Math.random()}`
    const supabase = createClient()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (payload) => {
          setMessages((prev) => [payload.new as ContactMessage, ...prev])
          toast('New Support Ticket!', { icon: '🔔' })
          
          // Play a sound
          try {
            const audio = new Audio('/sounds/bell-alarm.mp3') // Or some subtle notification sound if available
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch (e) {}
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contact_messages' },
        (payload) => {
          setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new as ContactMessage : m))
        }
      )
      .subscribe()

    const channel2Name = `admin-support-emergency-${Math.random()}`
    const channel2 = supabase
      .channel(channel2Name)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const t = payload.new as any
          const mapped: ContactMessage = {
            id: t.id,
            user_id: null,
            name: 'Emergency Ticket',
            email: t.email,
            phone: 'N/A',
            role: 'MAINTENANCE',
            issue: t.message,
            status: 'unread',
            created_at: t.created_at,
            is_emergency: true
          }
          setMessages((prev) => [mapped, ...prev])
          toast('New Emergency Ticket!', { icon: '🚨' })
          
          try {
            const audio = new Audio('/sounds/bell-alarm.mp3')
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch (e) {}
        }
      )
      .subscribe()

    return () => { 
      supabase.removeChannel(channel)
      supabase.removeChannel(channel2) 
    }
  }, [])

  async function fetchMessages() {
    try {
      const supabase = createClient()
      const [res1, res2] = await Promise.all([
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      ])
      
      if (res1.error) throw res1.error
      if (res2.error) throw res2.error

      const normalMessages = (res1.data || []) as ContactMessage[]
      const emergencyMessages = (res2.data || []).map((t: any) => ({
        id: t.id,
        user_id: null,
        name: 'Emergency Ticket',
        email: t.email,
        phone: 'N/A',
        role: 'MAINTENANCE',
        issue: t.message,
        status: t.status === 'open' ? 'unread' : 'resolved',
        created_at: t.created_at,
        is_emergency: true
      })) as ContactMessage[]

      const combined = [...normalMessages, ...emergencyMessages].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setMessages(combined)
    } catch (err) {
      toast.error('Failed to load support messages')
    } finally {
      setIsLoading(false)
    }
  }

  const markResolved = async (id: string, is_emergency?: boolean) => {
    try {
      const supabase = createClient()
      if (is_emergency) {
        const { error } = await supabase
          .from('support_tickets')
          .update({ status: 'resolved' })
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'resolved' })
          .eq('id', id)
        if (error) throw error
      }
      
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m))
      toast.success('Message marked as resolved')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (isLoading) {
    return <div className="p-10 font-bold text-gray-500">Loading support inbox...</div>
  }

  const unreadMessages = messages.filter(m => m.status === 'unread')
  const resolvedMessages = messages.filter(m => m.status === 'resolved')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Support Inbox</h1>
        <p className="text-gray-500 font-medium text-sm">Manage incoming messages from users</p>
      </div>

      {unreadMessages.length === 0 && resolvedMessages.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
          <p className="text-5xl mb-4">📫</p>
          <h3 className="text-lg font-bold text-gray-900">Inbox is empty</h3>
          <p className="text-gray-500">No support requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unread Section */}
          <div className="space-y-4">
            <h2 className="font-bold text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Needs Attention ({unreadMessages.length})
            </h2>
            <AnimatePresence>
              {unreadMessages.map(msg => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-2xl p-5 border shadow-sm relative overflow-hidden ${msg.is_emergency ? 'border-orange-500 shadow-orange-100' : 'border-red-100'}`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${msg.is_emergency ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{msg.name}</h3>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{msg.role}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.issue}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a href={`tel:${msg.phone}`} className="flex items-center justify-center gap-2 text-sm font-bold text-[#2563EB] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition w-full">
                      <Phone size={14} /> {msg.phone}
                    </a>
                    <div className="flex items-center justify-between mt-1">
                      <a href={`mailto:${msg.email}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition">
                        <Mail size={12} /> {msg.email}
                      </a>
                      <button 
                        onClick={() => markResolved(msg.id, msg.is_emergency)}
                        className="bg-[#16A34A] text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-green-600 transition shadow-sm"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {unreadMessages.length === 0 && (
                <p className="text-gray-400 text-sm italic">All caught up!</p>
              )}
            </AnimatePresence>
          </div>

          {/* Resolved Section */}
          <div className="space-y-4 opacity-75">
            <h2 className="font-bold text-gray-600 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Resolved ({resolvedMessages.length})
            </h2>
            {resolvedMessages.map(msg => (
              <div key={msg.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-700">{msg.name} <span className="text-xs font-normal text-gray-500 uppercase">({msg.role})</span></h3>
                  <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{msg.issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
