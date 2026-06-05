import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:/CampusBites/campus-bites/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getProfiles() {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) {
    console.error(error)
  } else {
    console.log("Existing Profiles:", data.map(r => ({ email: r.email, role: r.role })))
  }
}

getProfiles()
