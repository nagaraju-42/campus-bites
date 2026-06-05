import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:/CampusBites/campus-bites/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateShops() {
  const { data, error } = await supabase.from('shops').update({ dine_in_enabled: true }).not('id', 'is', null)
  console.log('Updated shops:', error || 'Success')
}
updateShops()
