import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedWatermarks() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'shop_payout_watermarks')
    .single()

  if (!data) {
    const { error: insertError } = await supabase
      .from('app_settings')
      .insert({ key: 'shop_payout_watermarks', value: '{}' })
    if (insertError) console.error("Insert error:", insertError)
    else console.log("Seeded shop_payout_watermarks successfully.")
  } else {
    console.log("shop_payout_watermarks already exists.")
  }
}

seedWatermarks()
