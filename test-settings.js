import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:/CampusBites/campus-bites/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  console.log('Testing app_settings update...')
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')

  if (error) {
    console.error('Update Error:', error)
  } else {
    console.log('Update Success:', data)
  }
}

testUpdate()
