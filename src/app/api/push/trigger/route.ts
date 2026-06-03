import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("VAPID keys missing, skipping push notification.");
      return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@campusbites.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { userId, title, body, url } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Fetch user's subscription
    const { data: subData } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (!subData || !subData.subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/'
    });

    try {
      await webpush.sendNotification(subData.subscription, payload);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error('Web push error:', err);
      // If subscription is invalid/expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);
      }
      return NextResponse.json({ error: 'Push failed' }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
