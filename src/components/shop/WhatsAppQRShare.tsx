'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

export default function WhatsAppQRShare({ shopId }: { shopId: string }) {
  const [phone, setPhone] = useState('')

  const handleShare = () => {
    if (!phone || phone.length < 10) return
    const cleanPhone = phone.replace(/\D/g, '')
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    
    // You can replace this with your actual production URL when deployed
    const url = `${window.location.origin}/student/menu/${shopId}`
    const message = `🍔 DineNDeliver - Order food instantly!

👉 Tap to order: ${url}

✅ No app download
✅ Order in 30 seconds
✅ Pay on delivery (Cash/PhonePe)`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank')
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#16A34A]/20 relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
          <Share2 size={20} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Send Order Link via WhatsApp</h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Don't take orders on call. Send this link!</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10 mt-auto">
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+91</span>
          <input 
            type="tel"
            placeholder="Student phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-gray-50 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <button 
          onClick={handleShare}
          disabled={phone.length < 10}
          className="w-full bg-[#25D366] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#1DA851] transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm shadow-green-200"
        >
          Send Link
        </button>
      </div>
    </div>
  )
}
