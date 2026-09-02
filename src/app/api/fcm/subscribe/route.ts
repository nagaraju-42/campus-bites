import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
);

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();

    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save FCM token', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


