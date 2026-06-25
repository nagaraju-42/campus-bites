'use server'

import { createClient } from '@supabase/supabase-js'
import { getFCM } from '@/lib/firebase-admin'

export async function sendOrderPushAction(userId: string, title: string, body: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'DEBUG: Push Action Started',
      message: `Action hit for ${userId}`,
      type: 'alert'
    });

    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', userId).single();
    
    if (profile?.fcm_token) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'DEBUG: Token Found',
        message: `Token: ${profile.fcm_token.substring(0, 10)}...`,
        type: 'alert'
      });

      try {
        const fcm = getFCM();
        await fcm.send({
          token: profile.fcm_token,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: { sound: 'default' }
          }
        });
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'DEBUG: FCM Sent Successfully',
          message: `FCM returned success!`,
          type: 'alert'
        });
      } catch (fcmError: any) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'DEBUG: FCM Not Initialized',
          message: fcmError.message,
          type: 'alert'
        });
      }
    } else {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'DEBUG: No Token',
        message: `Profile has no fcm_token`,
        type: 'alert'
      });
    }
  } catch (error: any) {
    console.error('Failed to send order push:', error);
  }
}
