import { createClient } from '../client'

export interface Promotion {
  id: string
  code: string
  banner_text: string
  discount_percent: number
  is_active: boolean
  created_at: string
}

export async function getActivePromotions() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching promotions:', error)
    return []
  }
  return data as Promotion[]
}

export async function getPromotionByCode(code: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()
  
  if (error) return null
  return data as Promotion
}
