import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Bypass RLS and delete all order_audit_logs
    const { error } = await supabaseAdmin
      .from('order_audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error('Error wiping audit logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Error wiping logs:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
