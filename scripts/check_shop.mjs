import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase.from('shops').select('name, cover_image, logo_url').ilike('name', '%softy%')
  console.log(data)
  if (error) console.error(error)
}

run()
