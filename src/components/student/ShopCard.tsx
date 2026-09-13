'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Shop } from '@/types'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useFavoritesStore } from '@/store/favoritesStore'
import {
  HeartOutlineIcon,
  HeartFilledIcon,
} from '../icons/CustomIcons'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CarouselSlide {
  image: string
  label?: string   // e.g. "Crunchy Chicken Burger"
  price?: number   // e.g. 289
}

// ── ShopImageCarousel ──────────────────────────────────────────────────────────
function ShopImageCarousel({
  slides,
  isAccessible,
  isFavorite,
  onFavoriteClick,
}: {
  slides: CarouselSlide[]
  isAccessible: boolean
  isFavorite: boolean
  onFavoriteClick: (e: React.MouseEvent) => void
}) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (slides.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
    }, 3000)
  }, [slides.length])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [startTimer, stopTimer])

  const slide = slides[current]

  return (
    <div className="relative w-full h-[220px] overflow-hidden bg-gray-200">
      {/* Images */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={s.image}
            alt={s.label || 'Food'}
            fill
            className="object-cover img-cinematic"
            sizes="(max-width: 430px) 100vw, 430px"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/25 pointer-events-none z-[1]" />

      {/* Top-left: item label badge */}
      {slide?.label && (
        <div className="absolute top-3 left-3 z-[2] flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2.5 py-1">
          {/* Swiggy-style small orange square icon */}
          <div className="w-4 h-4 bg-[#EA580C] rounded-sm flex items-center justify-center shrink-0">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
              <path d="M5 1l1.2 2.4L9 3.9 7 5.8l.5 2.7L5 7.2 2.5 8.5 3 5.8 1 3.9l2.8-.5L5 1z"/>
            </svg>
          </div>
          <span className="text-white text-[11px] font-semibold leading-none truncate max-w-[160px]">
            {slide.label}{slide.price ? ` · ₹${slide.price}` : ''}
          </span>
        </div>
      )}

      {/* Top-right: bookmark icon */}
      <button
        onClick={onFavoriteClick}
        className="absolute top-3 right-3 z-[2] w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
      >
        {isFavorite
          ? <HeartFilledIcon className="w-4 h-4" />
          : <HeartOutlineIcon className="w-4 h-4" />
        }
      </button>

      {/* Bottom: CLOSED overlay */}
      {!isAccessible && (
        <div className="absolute inset-0 bg-black/40 z-[2] flex items-center justify-center">
          <span className="bg-gray-800 text-white font-bold text-sm px-4 py-1.5 rounded-full uppercase tracking-wider">
            Currently Closed
          </span>
        </div>
      )}

      {/* Bottom: dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1 z-[3]">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-4 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ShopCard ───────────────────────────────────────────────────────────────────
export default function ShopCard({ shop, orderMode = 'delivery' }: { shop: Shop; orderMode?: string }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { favoriteShopIds, toggleFavorite } = useFavoritesStore()

  const [rating, setRating] = useState<string>('New')
  const [reviewCount, setReviewCount] = useState<number>(0)
  const [slides, setSlides] = useState<CarouselSlide[]>([])

  const isFavorite = favoriteShopIds.includes(shop.id)
  const isAccessible = Boolean(shop.is_open || (orderMode === 'dine_in' && shop.dine_in_enabled))

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch rating
      const { data: reviewData } = await supabase
        .from('shop_reviews')
        .select('rating')
        .eq('shop_id', shop.id)
      if (reviewData && reviewData.length > 0) {
        setReviewCount(reviewData.length)
        const avg = reviewData.reduce((acc, r) => acc + r.rating, 0) / reviewData.length
        setRating(avg.toFixed(1))
      }

      // Fetch all menu items with images to build carousel slides
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('name, price, image_url, is_featured, is_available')
        .eq('shop_id', shop.id)
        .eq('is_available', true)
        .eq('is_archived', false)
        .order('is_featured', { ascending: false })

      // Build slides: cover_image first, then item images
      const builtSlides: CarouselSlide[] = []

      if (menuData && menuData.length > 0) {
        // First item becomes the label for the first slide
        const firstItem = menuData[0]

        // Use cover_image as first slide with the first item's label
        if (shop.cover_image) {
          builtSlides.push({
            image: shop.cover_image,
            label: firstItem.name,
            price: firstItem.price,
          })
        }

        // Add item images as additional slides
        menuData.forEach((item, idx) => {
          if (item.image_url) {
            builtSlides.push({
              image: item.image_url,
              label: item.name,
              price: item.price,
            })
          }
        })
      } else if (shop.cover_image) {
        builtSlides.push({ image: shop.cover_image })
      }

      // Fallback if no images at all
      if (builtSlides.length === 0) {
        builtSlides.push({
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        })
      }

      setSlides(builtSlides)
    }
    fetchData()
  }, [shop.id, shop.cover_image])

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
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 ${
        isAccessible
          ? 'cursor-pointer hover:shadow-md hover:border-orange-100 active:scale-[0.99]'
          : 'cursor-not-allowed'
      }`}
    >
      {/* ── Carousel ── */}
      {slides.length > 0 ? (
        <ShopImageCarousel
          slides={slides}
          isAccessible={isAccessible}
          isFavorite={isFavorite}
          onFavoriteClick={handleFavoriteClick}
        />
      ) : (
        /* Skeleton while images load */
        <div className="w-full h-[220px] bg-gray-200 animate-pulse" />
      )}

      {/* ── Info section ── */}
      <div className={`px-3.5 pt-3 pb-3.5 ${!isAccessible ? 'opacity-60' : ''}`}>

        {/* Row 1: Shop name + rating badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-gray-900 text-[18px] leading-tight flex-1">
            {shop.name}
          </h3>
          {/* Green circular rating badge — exactly like Zomato */}
          <div className="flex items-center gap-1 bg-[#1BA672] text-white text-[13px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>{rating === 'New' ? 'New' : rating}</span>
          </div>
        </div>

        {/* Row 2: Delivery info — green text like Zomato */}
        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] font-semibold text-[#1BA672]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1BA672" strokeWidth="2.5" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>25–30 mins</span>
          <span className="text-gray-300 font-normal">·</span>
          <span>1 km</span>
          <span className="text-gray-300 font-normal">·</span>
          {/* Scooter icon */}
          <svg width="16" height="13" viewBox="0 0 24 18" fill="none" stroke="#1BA672" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="14" r="3"/><circle cx="19" cy="14" r="3"/>
            <path d="M5 14H2V9l4-4h5l3 5h4l1 4"/>
            <path d="M14 5l1 4"/>
          </svg>
          <span>Free</span>
        </div>

        {/* Row 3: Offer text (if min order / discount info) */}
        {shop.min_order_amount && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {/* Blue verified/discount circle icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#1B4ED8" opacity="0.15"/>
              <circle cx="12" cy="12" r="11" stroke="#1B4ED8" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-6" stroke="#1B4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[12px] font-semibold text-gray-500">
              Free delivery above ₹{shop.min_order_amount}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
