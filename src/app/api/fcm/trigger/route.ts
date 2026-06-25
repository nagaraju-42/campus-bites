import { NextResponse } from 'next/server';
import { getFCM } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Setup admin Supabase client to bypass RLS and fetch any user's FCM token
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, message } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fcm = getFCM();
    if (!fcm) {
      return NextResponse.json({ message: 'FCM not configured' }, { status: 200 });
    }

    // 1. Fetch user's FCM token
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.fcm_token) {
      console.log(`No FCM token found for user ${userId}`);
      return NextResponse.json({ message: 'No FCM token found, skipping push' }, { status: 200 });
    }

    // 2. Send FCM Push Notification
    const payload = {
      token: profile.fcm_token,
      notification: {
        title,
        body: message,
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default', // Using default sound. Custom sounds require specific Android channel setup.
        }
      }
    };

    const response = await fcm.send(payload);
    console.log('Successfully sent FCM push:', response);

    return NextResponse.json({ success: true, messageId: response });

  } catch (error: any) {
    console.error('Error triggering FCM:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
