'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users } from 'lucide-react'
import { motion } from 'framer-motion'

export default function OnlineUsersCounter({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [onlineCount, setOnlineCount] = useState<number>(0)

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to the same channel
    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // state is an object where keys are the presence keys (sessionIds)
        const uniqueUsers = Object.keys(state).length
        setOnlineCount(uniqueUsers)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm ${
        theme === 'dark' 
          ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}
      title="Active users browsing the app right now"
    >
      <div className="relative flex items-center justify-center w-2 h-2">
        <span className="absolute inline-flex w-full h-full bg-emerald-500 rounded-full opacity-75 animate-ping"></span>
        <span className="relative inline-flex w-2 h-2 bg-emerald-500 rounded-full"></span>
      </div>
      <Users size={14} className={theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'} />
      <span className="text-xs font-bold font-mono tracking-tight">{onlineCount}</span>
    </motion.div>
  )
}
