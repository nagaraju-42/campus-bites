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
  const { data: profileData, error: profileError } = await supabase.from('profiles').update({
    full_name: fullName,
    phone: phone,
    role: 'student'
  }).eq('id', userId).select()

  if (profileError || !profileData || profileData.length === 0) {
    console.error('Profile update error:', profileError || '0 rows updated')
    throw new Error('Failed to update profile. This usually means SUPABASE_SERVICE_ROLE_KEY on Vercel is incorrect or missing.')
  }

  // Check if student profile exists
  const { data: existingStudent } = await supabase.from('student_profiles').select('id').eq('id', userId).single()

  if (existingStudent) {
    const { data: studentData, error: studentError } = await supabase.from('student_profiles').update({
      college_name: 'Campus',
      hostel_name: hostelName,
      room_number: roomNumber || 'N/A'
    }).eq('id', userId).select()
    
    if (studentError || !studentData || studentData.length === 0) {
      console.error('Student profile update error:', studentError || '0 rows updated')
      throw new Error('Failed to update delivery details.')
    }
  } else {
    const { data: studentData, error: studentError } = await supabase.from('student_profiles').insert({
      id: userId,
      college_name: 'Campus',
      hostel_name: hostelName,
      room_number: roomNumber || 'N/A'
    }).select()
    
    if (studentError || !studentData || studentData.length === 0) {
      console.error('Student profile insert error:', studentError || '0 rows inserted')
      throw new Error('Failed to insert delivery details.')
    }
  }

  return { success: true }
}
