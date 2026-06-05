'use server'

import { createClient } from '@supabase/supabase-js'

export async function updateCheckoutLocationServer(userId: string, hostelName: string, roomNumber: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseKey) {
    throw new Error('Service role key is missing')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error: studentError } = await supabase.from('student_profiles').update({
    hostel_name: hostelName,
    room_number: roomNumber || 'N/A'
  }).eq('id', userId)

  if (studentError) {
    console.error('Student profile update error:', studentError)
    throw new Error('Failed to update delivery details.')
  }

  return { success: true }
}
