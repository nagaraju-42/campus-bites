'use server'

import { createClient } from '@supabase/supabase-js'
import { getFCM } from '@/lib/firebase-admin'

export async function sendOrderPushAction(userId: string, title: string, body: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', userId).single();
    
    if (profile?.fcm_token) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campusbites.vercel.app';
        
        // Use the API route that is verified to have correct env vars on Vercel
        await fetch(`${baseUrl}/api/fcm/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            title: title,
            message: body
          })
        });

        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'DEBUG: FCM Sent via API',
          message: `Triggered API route successfully`,
          type: 'alert'
        });
      } catch (fcmError: any) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'DEBUG: FCM API Failed',
          message: fcmError.message,
          type: 'alert'
        });
      }
    }
  } catch (error: any) {
    console.error('Failed to send order push:', error);
  }
}
