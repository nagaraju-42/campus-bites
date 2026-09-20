import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Resend API Key is missing. Check .env.local' }, { status: 500 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required to reset passwords. Please add it to .env.local' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find user by email using Admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === email)
    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true })
    }

    // Generate random 4 digit password
    const newPassword = Math.floor(1000 + Math.random() * 9000).toString()

    // Update user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    if (updateError) throw updateError

    // Send email using Resend API
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CampusBites <onboarding@resend.dev>',
        to: email,
        subject: 'Your New Temporary Password',
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h2 style="color: #EAB308;">Password Reset</h2>
            <p>Your password has been reset. You can now login using this temporary 4-digit password:</p>
            <div style="background: #FEFCE8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="letter-spacing: 5px; color: #111; margin: 0;">${newPassword}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">Please login and update your password from your profile settings as soon as possible.</p>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const emailErr = await emailRes.json()
      throw new Error(`Resend Error: ${emailErr.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


