import { NextResponse } from 'next/server';
import { getFCM } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { shopId, orderNumber, totalAmount } = await req.json();

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });
    }

    // 1. Look up the shop owner
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop?.owner_id) {
      return NextResponse.json({ message: 'No shop owner found' }, { status: 200 });
    }

    // 2. Look up the owner's FCM token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('fcm_token')
      .eq('id', shop.owner_id)
      .single();

    if (!profile?.fcm_token) {
      return NextResponse.json({ message: 'No FCM token for shop owner' }, { status: 200 });
    }

    // 3. Send FCM push
    const fcm = getFCM();
    if (!fcm) {
      return NextResponse.json({ message: 'FCM not configured' }, { status: 200 });
    }

    const response = await fcm.send({
      token: profile.fcm_token,
      notification: {
        title: '🚨 New Order Received! 🚨',
        body: `Order ${orderNumber} for ${totalAmount}`,
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
        }
      }
    });

    console.log('Order push sent:', response);
    return NextResponse.json({ success: true, messageId: response });

  } catch (error: any) {
    console.error('Order push error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
