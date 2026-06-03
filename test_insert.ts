import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testInsert() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // invalid uuid, let's see what happens
      subscription: {}
    });

  console.log("Error:", error?.message);
}

testInsert();
