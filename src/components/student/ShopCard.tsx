'use client'

import { useRouter } from 'next/navigation'
import { Clock, Star } from 'lucide-react'
import { Shop } from '@/types'

export default function ShopCard({ shop }: { shop: Shop }) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/student/menu/${shop.id}`)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow active:scale-98"
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-gray-900 text-base truncate pr-2">{shop.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0 border ${
              shop.is_open
                ? 'bg-[#F0FDF4] text-[#16A34A] border-[#86EFAC]'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              {shop.is_open ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1 text-gray-900">
              <Star size={12} className="text-[#EAB308]" fill="currentColor" />
              <span className="text-xs font-bold">4.6</span>
              <span className="text-gray-400 text-[10px] font-medium">(230+)</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-gray-500">
              <Clock size={12} />
              <span className="text-xs font-medium">30 mins</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-500">₹40 min</span>
          </div>
          
          <p className="text-gray-400 text-xs mt-2 line-clamp-1 font-medium">
            {shop.description || 'Biryani, Chinese, Snacks'}
          </p>
        </div>
      </div>
    </div>
  )
}
