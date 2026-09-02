import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Requires Service Role Key to bypass RLS and insert subscriptions safely
const supabaseAdmin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder')
);

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription) {
      return NextResponse.json({ error: 'Missing userId or subscription' }, { status: 400 });
    }

    // Upsert the subscription
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({ 
        user_id: userId, 
        subscription: subscription 
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save subscription', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


