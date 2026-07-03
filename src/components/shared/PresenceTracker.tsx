'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { usePresenceStore } from '@/store/presenceStore'

export default function PresenceTracker() {
  useEffect(() => {
    const supabase = createClient()
    const sessionId = uuidv4()
    
    // Create a unique channel for this client so we don't conflict with other channels
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: sessionId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        usePresenceStore.getState().setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            session_id: sessionId
          })
        }
      })

    return () => {
      // Clean up when the user leaves the page or unmounts
      supabase.removeChannel(channel)
    }
  }, [])

  return null // This component doesn't render anything
}
