'use server'

import { createClient } from '@/lib/supabase/server'
import { getFCM } from '@/lib/firebase-admin'

export async function sendOrderPushAction(userId: string, title: string, body: string) {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', userId).single();
    
    if (profile?.fcm_token) {
      const fcm = getFCM();
      if (fcm) {
        await fcm.send({
          token: profile.fcm_token,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: { sound: 'default' }
          }
        });
        console.log(`Successfully sent order push to ${userId}`);
      }
    }
  } catch (error) {
    console.error('Failed to send order push:', error);
  }
}
