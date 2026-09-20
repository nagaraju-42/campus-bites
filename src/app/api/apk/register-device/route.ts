import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS for device registration
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, deviceName, fcmToken } = await req.json()

    if (!userId || !deviceName) {
      return NextResponse.json({ error: 'Missing userId or deviceName' }, { status: 400 })
    }

    // Get the shop associated with this user
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('id, name')
      .eq('owner_id', userId)
      .single()

    // Upsert device entry (one per user, update if exists)
    const { error } = await supabaseAdmin
      .from('apk_devices')
      .upsert({
        shop_owner_id: userId,
        shop_id: shop?.id ?? null,
        shop_name: shop?.name ?? 'Unknown Shop',
        device_name: deviceName,
        fcm_token: fcmToken ?? null,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'shop_owner_id'
      })

    if (error) {
      console.error('Device registration error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
