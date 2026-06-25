import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { fcm } from '@/lib/firebase-admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let webPushSuccess = false;
    let fcmPushSuccess = false;

    // --- 1. FCM PUSH NOTIFICATION (ANDROID NATIVE) ---
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('fcm_token')
        .eq('id', userId)
        .single();

      if (profile?.fcm_token) {
        await fcm.send({
          token: profile.fcm_token,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'kds_alarms' }
          }
        });
        fcmPushSuccess = true;
        console.log(`FCM Push sent to ${userId}`);
      }
    } catch (fcmErr) {
      console.error('FCM Push Error:', fcmErr);
    }

    // --- 2. WEB PUSH NOTIFICATION (BROWSER PWA) ---
    try {
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:admin@campusbites.com',
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        const { data: subData } = await supabaseAdmin
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', userId)
          .single();

        if (subData?.subscription) {
          const payload = JSON.stringify({ title, body, url: url || '/' });
          await webpush.sendNotification(subData.subscription, payload);
          webPushSuccess = true;
          console.log(`Web Push sent to ${userId}`);
        }
      }
    } catch (webErr: any) {
      console.error('Web push error:', webErr);
      if (webErr.statusCode === 410 || webErr.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);
      }
    }

    if (!webPushSuccess && !fcmPushSuccess) {
      return NextResponse.json({ message: 'No active push subscriptions found' }, { status: 200 });
    }

    return NextResponse.json({ success: true, webPushSuccess, fcmPushSuccess });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
