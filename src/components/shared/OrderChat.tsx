'use client'

import { useEffect, useState, useRef } from 'react'
import { Send, User as UserIcon, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrderChats, sendChatMessage, ChatMessage } from '@/lib/supabase/queries/chat'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function OrderChat({ orderId }: { orderId: string }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_chats', filter: `order_id=eq.${orderId}` },
        () => {
          loadMessages() // Reload to get sender profiles attached
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    try {
      const data = await getOrderChats(orderId)
      setMessages(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const tempMessage = newMessage
    setNewMessage('')
    try {
      await sendChatMessage(orderId, user.id, tempMessage)
    } catch (err) {
      toast.error('Failed to send message')
      setNewMessage(tempMessage)
    }
  }

  if (isLoading) {
    return <div className="p-4 text-center text-slate-500 text-sm font-bold">Loading chat...</div>
  }

  return (
    <div className="flex flex-col h-[400px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-100 p-4 border-b border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Order Support Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium text-center">
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id
            const isShop = msg.sender?.role === 'shop_owner' || msg.sender?.role === 'kitchen'
            const isAdmin = msg.sender?.role === 'admin'
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  isMe 
                    ? 'bg-[#2563EB] text-white rounded-br-none' 
                    : isAdmin 
                      ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-bl-none'
                      : isShop
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-bl-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 opacity-70">
                      {isShop ? <Store size={12} /> : isAdmin ? <span className="font-bold text-[10px]">ADMIN</span> : <UserIcon size={12} />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {msg.sender?.full_name}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 text-slate-900 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-[#2563EB] text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[#2563EB] transition"
          >
            <Send size={18} />
          </button>
        </form>
    </div>
  )
}
