'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Use service role key to bypass RLS for admin actions
const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
)

export async function adminAddFakeReview(shopId: string, name: string, rating: number, comment: string) {
  const { error } = await supabase.from('shop_reviews').insert({
    shop_id: shopId,
    fake_name: name,
    rating,
    comment
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/shops/${shopId}/reviews`)
  return true
}

export async function adminDeleteReview(reviewId: string, shopId: string) {
  const { error } = await supabase.from('shop_reviews').delete().eq('id', reviewId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/shops/${shopId}/reviews`)
  return true
}

export async function adminGetReviews(shopId: string) {
  const { data, error } = await supabase
    .from('shop_reviews')
    .select(`
      *,
      profiles:student_id(full_name)
    `)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

