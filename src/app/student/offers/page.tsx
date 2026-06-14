'use client'

import { useEffect, useState } from 'react'
import { getActivePromotions, Promotion } from '@/lib/supabase/queries/promotions'
import { ArrowRight, Tag } from 'lucide-react'

export default function OffersPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getActivePromotions()
      .then(setPromotions)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-[430px] mx-auto font-sans pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-[22px] font-extrabold text-gray-900">Offers & Deals</h1>
        <p className="text-gray-400 text-sm mt-0.5">Exclusive deals just for you</p>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 bg-[#FEF3E8] rounded-2xl p-5 border border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#EA580C] rounded-xl flex items-center justify-center">
            <Tag className="text-white" size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-[16px]">Great food, great deals!</h2>
            <p className="text-gray-500 text-[12px]">Enjoy exclusive offers and save more</p>
          </div>
        </div>
      </div>

      {/* Promotions */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          ))
        ) : promotions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🏷️</p>
            <p className="font-bold text-lg text-gray-500">No active offers</p>
            <p className="text-sm mt-1">Check back soon for deals!</p>
          </div>
        ) : (
          promotions.map((promo) => (
            <div key={promo.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-100 text-orange-700 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {promo.discount_percent}% OFF
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-[15px]">{promo.banner_text}</h3>
                  {promo.code && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-dashed border-orange-300 rounded-lg px-3 py-1.5">
                      <span className="text-[#EA580C] font-mono font-bold text-[13px]">{promo.code}</span>
                    </div>
                  )}
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowRight className="text-orange-500" size={18} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
