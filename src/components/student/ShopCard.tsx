'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock, Star } from 'lucide-react'
import { Shop } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ShopCard({ shop, orderMode = 'delivery' }: { shop: Shop, orderMode?: string }) {
  const router = useRouter()
  const [rating, setRating] = useState<string>('New')
  const [reviewCount, setReviewCount] = useState<number>(0)

  useEffect(() => {
    async function fetchReviews() {
      const supabase = createClient()
      const { data } = await supabase.from('shop_reviews').select('rating').eq('shop_id', shop.id)
      if (data && data.length > 0) {
        setReviewCount(data.length)
        const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length
        setRating(avg.toFixed(1))
      }
    }
    fetchReviews()
  }, [shop.id])

  const isAccessible = shop.is_open || (orderMode === 'dine_in' && shop.dine_in_enabled)

  const handleCardClick = () => {
    if (isAccessible) {
      router.push(`/student/menu/${shop.id}?mode=${orderMode}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 transition-all ${
        isAccessible ? 'hover:shadow-md cursor-pointer active:scale-[0.98]' : 'opacity-70 grayscale cursor-not-allowed'
      }`}
    >
      {/* 16:9 Cover Image Area */}
      <div className="relative w-full aspect-[16/9] bg-gray-100">
        {shop.cover_image ? (
          <Image 
            src={shop.cover_image} 
            alt={shop.name} 
            fill 
            className="object-cover" 
            sizes="(max-width: 430px) 100vw, 430px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-5xl drop-shadow-sm">🍽️</span>
          </div>
        )}
        
        {/* Gradient Overlay for Text Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {!isAccessible && (
            <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Closed
            </span>
          )}
          {shop.is_open && isAccessible && (
            <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Open
            </span>
          )}
        </div>

        {/* Floating Time/Distance Badge */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
          <Clock size={12} className="text-gray-600" />
          <span>30 mins</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 relative mt-1">
        <div className="flex items-start gap-3">
          <div className="relative w-14 h-14 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden flex-shrink-0 -mt-10 z-10">
            {shop.logo_url ? (
              <Image src={shop.logo_url} alt={`${shop.name} logo`} fill className="object-cover" sizes="56px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500 font-bold text-xl uppercase">
                {shop.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-display font-bold text-gray-900 text-lg leading-tight truncate">{shop.name}</h3>
            <p className="text-gray-500 text-[11px] mt-0.5 truncate font-medium">
              {shop.description || 'Biryani, Fast Food, Beverages'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${reviewCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
              <span className="font-bold text-sm">{rating}</span>
              <Star size={12} fill="currentColor" />
            </div>
            <span className="text-gray-400 text-[10px] font-medium mt-1">
              {reviewCount === 0 ? 'No ratings yet' : `${reviewCount} rating${reviewCount > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-gray-100">
          {(shop.min_order_amount ?? 0) > 0 && (
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              ₹{shop.min_order_amount} min order
            </span>
          )}
          {orderMode === 'dine_in' && (
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Dine-In Available
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
