'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Trash2, UserPlus } from 'lucide-react'
import { adminGetReviews, adminDeleteReview, adminAddFakeReview } from '@/app/actions/adminReviews'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function AdminShopReviewsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  
  const [shopName, setShopName] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [fakeName, setFakeName] = useState('')
  const [fakeRating, setFakeRating] = useState(5)
  const [fakeComment, setFakeComment] = useState('')
  const [isAddingFake, setIsAddingFake] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: shop } = await supabase.from('shops').select('name').eq('id', shopId).single()
        if (shop) setShopName(shop.name)

        const data = await adminGetReviews(shopId)
        setReviews(data)
      } catch (err) {
        toast.error('Failed to load reviews')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shopId])

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await adminDeleteReview(reviewId, shopId)
      setReviews(reviews.filter(r => r.id !== reviewId))
      toast.success('Review deleted')
    } catch (err) {
      toast.error('Failed to delete review')
    }
  }

  const handleAddFake = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingFake(true)
    try {
      await adminAddFakeReview(shopId, fakeName, fakeRating, fakeComment)
      toast.success('Fake review added!')
      setFakeName('')
      setFakeComment('')
      setFakeRating(5)
      
      const data = await adminGetReviews(shopId)
      setReviews(data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to add fake review')
    } finally {
      setIsAddingFake(false)
    }
  }

  if (isLoading) return <div className="p-10 text-white font-bold">Loading Reviews...</div>

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Manage Reviews</h1>
            <p className="text-slate-400 text-sm">Shop: {shopName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Add Fake Review */}
        <div className="md:col-span-1">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <UserPlus size={18} className="text-yellow-400"/> Add Fake Review
            </h3>
            <form onSubmit={handleAddFake} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reviewer Name</label>
                <input 
                  type="text" 
                  value={fakeName}
                  onChange={e => setFakeName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setFakeRating(star)}>
                      <Star size={20} className={fakeRating >= star ? 'text-yellow-400' : 'text-slate-700'} fill={fakeRating >= star ? 'currentColor' : 'none'}/>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comment</label>
                <textarea 
                  value={fakeComment}
                  onChange={e => setFakeComment(e.target.value)}
                  placeholder="The food was amazing!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 min-h-[80px]"
                  required
                />
              </div>
              <button 
                disabled={isAddingFake}
                type="submit" 
                className="w-full bg-yellow-400 text-yellow-950 font-bold py-2.5 rounded-lg hover:bg-yellow-300 transition"
              >
                {isAddingFake ? 'Adding...' : 'Inject Review'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Review List */}
        <div className="md:col-span-2 space-y-4">
          {reviews.length === 0 ? (
            <div className="p-10 text-center bg-[#1E293B] border border-slate-700/50 rounded-2xl">
              <p className="text-slate-400">No reviews found for this shop.</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-sm flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white">
                      {review.fake_name || review.profiles?.full_name || 'Anonymous'}
                    </h4>
                    {review.fake_name && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/30">
                        ADMIN FAKE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <div className="flex items-center text-yellow-400">
                      <span className="font-bold mr-1">{review.rating}</span>
                      <Star size={10} fill="currentColor" />
                    </div>
                    <span>•</span>
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                  <p className="text-slate-300 text-sm">{review.comment}</p>
                </div>
                <button 
                  onClick={() => handleDelete(review.id)}
                  className="text-slate-500 hover:text-red-500 p-2 bg-slate-800 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
