'use client'

import SimpleKDS from '@/components/shop/SimpleKDS'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function LiveOrdersPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-0 md:p-4 md:items-center md:justify-center">
      {/* Mobile Constraint Container */}
      <div className="w-full max-w-[500px] h-[100dvh] md:h-[850px] bg-gray-50 md:border-[8px] border-slate-800 md:rounded-[3rem] flex flex-col overflow-hidden relative shadow-2xl mx-auto ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-200 bg-white shrink-0 shadow-sm z-10">
          <button 
            onClick={() => router.push('/shop/dashboard')} 
            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Live Orders</h1>
            <p className="text-xs font-bold text-gray-400">Simple View</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-24">
          <SimpleKDS />
        </div>
      </div>
    </div>
  )
}
