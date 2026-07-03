'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const presenceTrackStatus = await channel.track({
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
