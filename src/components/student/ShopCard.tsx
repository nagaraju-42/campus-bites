'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Shop } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useFavoritesStore } from '@/store/favoritesStore'
import {
  VerifiedBadgeIcon,
  HeartOutlineIcon,
  HeartFilledIcon,
  ClockIcon,
  ScooterIcon,
  WalletIcon,
} from '../icons/CustomIcons'

export default function ShopCard({ shop, orderMode = 'delivery' }: { shop: Shop; orderMode?: string }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { favoriteShopIds, toggleFavorite } = useFavoritesStore()

  const [rating, setRating] = useState<string>('New')
  const [reviewCount, setReviewCount] = useState<number>(0)

  const isFavorite = favoriteShopIds.includes(shop.id)
  const isAccessible = shop.is_open || (orderMode === 'dine_in' && shop.dine_in_enabled)

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

  const handleCardClick = () => {
    if (isAccessible) router.push(`/student/menu/${shop.id}?mode=${orderMode}`)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { router.push('/student/login'); return }
    toggleFavorite(user.id, shop.id)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-row gap-3 transition-all duration-200 overflow-hidden ${
        isAccessible
          ? 'cursor-pointer hover:shadow-md hover:border-orange-100 active:scale-[0.99]'
          : 'opacity-60 grayscale cursor-not-allowed'
      }`}
    >
      {/* ── Cover Image ── */}
      <div className="relative w-[130px] h-[155px] shrink-0 overflow-hidden bg-gray-100 img-vignette">
        {shop.cover_image ? (
          <Image
            src={shop.cover_image}
            alt={shop.name}
            fill
            className="object-cover img-cinematic-hover"
            sizes="130px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-900 to-gray-900">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {/* Bottom gradient for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none z-[1]" />

        {/* OPEN / CLOSED badge – bottom left */}
        <div className="absolute bottom-2 left-2 z-[2]">
          {isAccessible ? (
            <span className="bg-[#00A855] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
              OPEN
            </span>
          ) : (
            <span className="bg-gray-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
              CLOSED
            </span>
          )}
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-between">
        {/* Title + heart */}
        <div>
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h3 className="font-extrabold text-gray-900 text-[16px] leading-tight truncate">
                {shop.name}
              </h3>
              {shop.is_verified && <VerifiedBadgeIcon className="shrink-0 w-[18px] h-[18px]" />}
            </div>
            <button
              onClick={handleFavoriteClick}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 transition shrink-0"
            >
              {isFavorite
                ? <HeartFilledIcon className="w-5 h-5" />
                : <HeartOutlineIcon className="w-5 h-5" />
              }
            </button>
          </div>

          {/* Categories */}
          <p className="text-gray-400 text-[12px] font-medium truncate mb-1.5">
            {shop.categories && shop.categories.length > 0
              ? shop.categories.join(' • ')
              : (shop.description || 'Food • Snacks • Beverages')}
          </p>

          {/* Star rating */}
          <div className="flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[#F59E0B] font-bold text-[12px] leading-none">{rating}</span>
            <span className="text-gray-400 text-[11px] leading-none">
              ({reviewCount === 0 ? 'New' : `${reviewCount} ratings`})
            </span>
          </div>
        </div>

        {/* Delivery Time + Fee */}
        <div className="flex items-center gap-2 mt-2">
          <div className="bg-[#FFF5F1] rounded-xl py-1.5 px-2 flex-1 flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span className="text-gray-900 font-bold text-[11px] leading-tight">30 mins</span>
              <span className="text-gray-400 text-[10px] leading-tight">Delivery Time</span>
            </div>
          </div>
          <div className="bg-[#FFF5F1] rounded-xl py-1.5 px-2 flex-1 flex items-center gap-1.5">
            <ScooterIcon className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span className="text-gray-900 font-bold text-[11px] leading-tight">₹{shop.delivery_fee || 15}</span>
              <span className="text-gray-400 text-[10px] leading-tight">Delivery Fee</span>
            </div>
          </div>
        </div>

        {/* Min Order */}
        <div className="mt-2">
          <div className="bg-[#F0FDF4] rounded-xl w-full py-1.5 px-3 flex items-center gap-2">
            <WalletIcon className="w-4 h-4 shrink-0" />
            <span className="text-[#166534] font-bold text-[11px] uppercase tracking-wide">
              ₹{shop.min_order_amount || 100} MIN ORDER
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
