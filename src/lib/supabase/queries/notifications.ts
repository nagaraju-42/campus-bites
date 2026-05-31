import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }
  return data || []
}

export async function insertNotification(params: {
  userId: string
  title: string
  message: string
  type?: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'system'
    })

  if (error) {
    console.error("Failed to insert notification:", error)
  }
}

export async function markNotificationsAsRead(userId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error("Failed to mark notifications as read:", error)
  }
}

export async function broadcastNotification(shopId: string, shopName: string, message: string) {
  const supabase = createClient()
  const channel = supabase.channel('campus-broadcasts')
  
  return new Promise((resolve, reject) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'announcement',
            payload: {
              title: `📢 Update from ${shopName}`,
              message: message
            }
          })
          await supabase.removeChannel(channel)
          resolve(true)
        } catch (err) {
          reject(err)
        }
      }
    })
  })
}
