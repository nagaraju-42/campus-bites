'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock, Star } from 'lucide-react'
import { Shop } from '@/types'

export default function ShopCard({ shop, orderMode = 'delivery' }: { shop: Shop, orderMode?: string }) {
  const router = useRouter()

  const isAccessible = shop.is_open || (orderMode === 'dine_in' && shop.dine_in_enabled)

  const handleCardClick = () => {
    if (isAccessible) {
      router.push(`/student/menu/${shop.id}?mode=${orderMode}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all ${isAccessible ? 'hover:shadow-md cursor-pointer active:scale-98' : 'opacity-60 grayscale cursor-not-allowed'}`}
    >
      <div className="flex items-start gap-4 relative">
        {!isAccessible && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          </div>
        )}
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 relative">
          {shop.logo_url ? (
            <Image src={shop.logo_url} alt={shop.name} fill className="object-cover" sizes="64px" />
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-gray-900 text-base truncate pr-2">{shop.name}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0 border ${
              isAccessible
                ? 'bg-[#F0FDF4] text-[#16A34A] border-[#86EFAC]'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              {isAccessible ? 'OPEN' : 'CLOSED'}
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
