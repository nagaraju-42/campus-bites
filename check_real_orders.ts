import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need the service role key to bypass RLS and see what is ACTUALLY in the database!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkRealOrders() {
  const { data: shops } = await supabase.from('shops').select('id, owner_id, name');
  console.log("Shops in DB:", shops);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('placed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching orders:", error.message);
  } else {
    console.log(`Found ${orders.length} orders total in DB (bypassing RLS if service key present).`);
    if (orders.length > 0) {
      console.log("Latest order:", orders[0]);
    }
  }
}

checkRealOrders();
