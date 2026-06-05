'use server'

import { createClient } from '@supabase/supabase-js'

export async function updateProfileServer(userId: string, fullName: string, phone: string, hostelName: string, roomNumber: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseKey) {
    throw new Error('Service role key is missing')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Update profiles
  const { error: profileError } = await supabase.from('profiles').update({
    full_name: fullName,
    phone: phone,
    role: 'student'
  }).eq('id', userId)

  if (profileError) {
    console.error('Profile update error:', profileError)
    throw new Error('Failed to update profile data.')
  }

  // Check if student profile exists
  const { data: existingStudent } = await supabase.from('student_profiles').select('id').eq('id', userId).single()

  if (existingStudent) {
    const { error: studentError } = await supabase.from('student_profiles').update({
      college_name: 'Campus',
      hostel_name: hostelName,
      room_number: roomNumber || 'N/A'
    }).eq('id', userId)
    
    if (studentError) {
      console.error('Student profile update error:', studentError)
      throw new Error('Failed to update delivery details.')
    }
  } else {
    const { error: studentError } = await supabase.from('student_profiles').insert({
      id: userId,
      college_name: 'Campus',
      hostel_name: hostelName,
      room_number: roomNumber || 'N/A'
    })
    
    if (studentError) {
      console.error('Student profile insert error:', studentError)
      throw new Error('Failed to insert delivery details.')
    }
  }

  return { success: true }
}
