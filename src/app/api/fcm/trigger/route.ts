import { NextResponse } from 'next/server';
import { getFCM } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Setup admin Supabase client to bypass RLS and fetch any user's FCM token
const supabaseAdmin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, message, data } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fcm = getFCM();
    if (!fcm) {
      return NextResponse.json({ message: 'FCM not configured' }, { status: 200 });
    }

    const tokens = new Set<string>();

    // 1. Fetch user's main profile token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();
    
    if (profile?.fcm_token) tokens.add(profile.fcm_token);

    // 2. Fetch all APK devices for this shop owner
    const { data: devices } = await supabaseAdmin
      .from('apk_devices')
      .select('fcm_token')
      .eq('shop_owner_id', userId);
      
    if (devices) {
      devices.forEach(d => d.fcm_token && tokens.add(d.fcm_token));
    }

    // 3. Fetch all admins' FCM tokens
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('fcm_token')
      .eq('role', 'admin');

    if (admins) {
      admins.forEach(a => a.fcm_token && tokens.add(a.fcm_token));
    }

    if (tokens.size === 0) {
      console.log(`No FCM tokens found for user ${userId} or admins`);
      return NextResponse.json({ message: 'No FCM token found, skipping push' }, { status: 200 });
    }

    // 4. Send FCM Push Notification to all collected tokens
    const payload = {
      notification: {
        title,
        body: message,
      },
      data: data || {}, // Pass orderId or other deep-link data here
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'campus_orders_v3',
          sound: 'bell_alarm'
        }
      },
      tokens: Array.from(tokens)
    };

    const response = await fcm.sendEachForMulticast(payload);
    console.log(`Successfully sent ${response.successCount} FCM pushes. Failed: ${response.failureCount}`);

    return NextResponse.json({ success: true, count: response.successCount });

  } catch (error: any) {
    console.error('Error triggering FCM:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


