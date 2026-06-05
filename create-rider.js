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

async function createRider() {
  const email = 'rider11@campusbites.com'
  const password = 'password123'

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (authError && !authError.message.includes('already registered')) {
      throw authError
    }

    // 2. Login to establish session so RLS passes!
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (loginError) throw loginError

    const userId = loginData.user.id

    // 3. Add profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'rider',
      full_name: 'Fixed Delivery Boy',
      email: email,
      phone: '9876543210'
    })

    if (profileError) throw profileError

    console.log(`Successfully created new Rider credentials!
Email: ${email}
Password: ${password}`)
  } catch (error) {
    console.error("Error creating rider:", error)
  }
}

createRider()
