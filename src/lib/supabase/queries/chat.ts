import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  order_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: {
    full_name: string
    role: string
  }
}

export async function getOrderChats(orderId: string): Promise<ChatMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('order_chats')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  // Fetch profiles for sender info
  const senderIds = [...new Set(data.map(m => m.sender_id))]
  let profiles: any[] = []
  if (senderIds.length > 0) {
    const { data: pData } = await supabase.from('profiles').select('id, full_name, role').in('id', senderIds)
    if (pData) profiles = pData
  }

  return data.map(msg => ({
    ...msg,
    sender: profiles.find(p => p.id === msg.sender_id) || { full_name: 'Unknown', role: 'unknown' }
  }))
}

export async function sendChatMessage(orderId: string, senderId: string, message: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('order_chats')
    .insert({
      order_id: orderId,
      sender_id: senderId,
      message
    })

  if (error) throw new Error(error.message)
}
