import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSubscriptions() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.log("Error fetching subscriptions:", error);
  } else {
    console.log(`Found ${data.length} push subscriptions in the database.`);
    if (data.length > 0) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

checkSubscriptions();
