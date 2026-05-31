'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, X, MessageSquare, AlertCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getUserNotifications, markNotificationsAsRead, Notification } from '@/lib/supabase/queries/notifications'
import { useAuthStore } from '@/store/authStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsTray({ isOpen, onClose }: Props) {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !isOpen) return

    async function load() {
      const data = await getUserNotifications(user!.id)
      setNotifications(data)
      setIsLoading(false)
    }
    load()

    const supabase = createClient()
    const sub = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [user, isOpen])

  const handleMarkAsRead = async () => {
    if (!user) return
    await markNotificationsAsRead(user.id)
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Tray */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[90%] max-w-[400px] bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell size={20} className="text-gray-900" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <h2 className="font-bold text-gray-900">Notifications</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="px-5 py-3 border-b border-gray-100 flex justify-end">
                <button 
                  onClick={handleMarkAsRead}
                  className="text-xs font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1"
                >
                  <Check size={14} /> Mark all as read
                </button>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-medium text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`flex gap-3 p-3 rounded-2xl transition ${n.is_read ? 'opacity-70' : 'bg-blue-50/50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      n.type === 'message' ? 'bg-green-100 text-green-600' :
                      n.type === 'alert' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {n.type === 'message' ? <MessageSquare size={18} /> :
                       n.type === 'alert' ? <AlertCircle size={18} /> :
                       <Info size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
                        {!n.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-gray-400 text-[10px] font-medium mt-2">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
