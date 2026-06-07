'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, User, Send, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ShopReviewsProps {
  shopId: string
  shopName: string
}

export default function ShopReviews({ shopId, shopName }: ShopReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [hasOrdered, setHasOrdered] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('shop_reviews')
        .select(`
          *,
          profiles:student_id(full_name)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
      
      if (reviewData) setReviews(reviewData)

      // Check if user has ordered from this shop
      if (user) {
        const { data: pastOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('student_id', user.id)
          .eq('shop_id', shopId)
          .limit(1)

        if (pastOrders && pastOrders.length > 0) {
          setHasOrdered(true)
        }

        // Check if user already reviewed
        const userReview = reviewData?.find(r => r.student_id === user.id)
        if (userReview) setHasReviewed(true)
      }

      setIsLoading(false)
    }
    loadData()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return toast.error('Please log in to review')
    if (!hasOrdered) return toast.error(`You must order from ${shopName} before leaving a review!`)
    
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('shop_reviews').insert({
        shop_id: shopId,
        student_id: currentUser.id,
        rating,
        comment
      })
      if (error) throw error

      toast.success('Review submitted successfully!')
      setHasReviewed(true)
      
      // Reload reviews
      const { data } = await supabase
        .from('shop_reviews')
        .select('*, profiles:student_id(full_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
      if (data) setReviews(data)
        
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading reviews...</div>

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : 'New'

  return (
    <div className="px-5 py-6">
      
      {/* Overview Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Overall Rating</h3>
          <p className="text-sm text-gray-500 font-medium">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-orange-50 px-4 py-3 rounded-2xl flex flex-col items-center justify-center border border-orange-100">
          <div className="flex items-center gap-1 text-[#DC2626] mb-1">
            <span className="text-2xl font-display font-bold">{avgRating}</span>
            <Star size={20} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Review Form */}
      {currentUser && !hasReviewed ? (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            Write a Review
            {hasOrdered ? (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider"><CheckCircle2 size={10}/> Verified Buyer</span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Purchase Required</span>
            )}
          </h3>
          <form onSubmit={handleSubmit} className={!hasOrdered ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition hover:scale-110 active:scale-95"
                >
                  <Star size={28} className={rating >= star ? 'text-[#EAB308]' : 'text-gray-200'} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`How was the food from ${shopName}?`}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#DC2626] mb-4 min-h-[100px] resize-none"
              required
            />
            <button 
              disabled={isSubmitting || !hasOrdered}
              type="submit" 
              className="w-full bg-[#DC2626] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
            >
              <Send size={16} /> {isSubmitting ? 'Posting...' : 'Post Review'}
            </button>
            {!hasOrdered && (
              <p className="text-center text-xs text-red-500 font-bold mt-3">You must place an order from this shop first!</p>
            )}
          </form>
        </div>
      ) : currentUser && hasReviewed ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-8 text-center">
          <p className="text-green-700 font-bold text-sm">You have already reviewed this shop. Thank you! 🌟</p>
        </div>
      ) : null}

      {/* Review List */}
      <h3 className="font-bold text-gray-900 mb-4">Customer Reviews</h3>
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-3xl border border-gray-100">
            <p className="text-gray-500 font-medium text-sm">No reviews yet. Be the first!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{review.fake_name || review.profiles?.full_name || 'Anonymous Student'}</p>
                    <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                  <span className="font-bold text-sm text-gray-900">{review.rating}</span>
                  <Star size={12} className="text-[#EAB308]" fill="currentColor" />
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
