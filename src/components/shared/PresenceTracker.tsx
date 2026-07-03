'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { usePresenceStore } from '@/store/presenceStore'
import { RealtimeChannel } from '@supabase/supabase-js'

export default function PresenceTracker() {
  useEffect(() => {
    let isMounted = true
    const supabase = createClient()
    const sessionId = uuidv4()
    
    // First, check if the channel already exists in the client's cache
    let channel = supabase.getChannels().find(c => c.topic === 'realtime:online-users')

    if (!channel) {
      channel = supabase.channel('online-users', {
        config: {
          presence: { key: sessionId },
        },
      })

      try {
        channel
          .on('presence', { event: 'sync' }, () => {
            if (!isMounted) return
            const state = channel!.presenceState()
            usePresenceStore.getState().setOnlineCount(Object.keys(state).length)
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && isMounted) {
              await channel!.track({
                online_at: new Date().toISOString(),
                session_id: sessionId
              })
            }
          })
      } catch (err) {
        console.warn('PresenceTracker setup error (likely hot-reload artifact):', err)
      }
    }

    return () => {
      isMounted = false
      // Only remove the channel if it's a hot-reload unmount, 
      // but to be safe against strict mode, we actually don't force remove 
      // the channel if it's the root layout, as it lives for the session.
    }
  }, [])

  return null // This component doesn't render anything
}
