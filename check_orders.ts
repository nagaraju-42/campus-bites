import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkOrders() {
  console.log("Checking all active orders in the database...");
  const { data, error } = await supabase
    .from('orders')
    .select('id, shop_id, student_id, status, placed_at')
    .in('status', ['pending', 'preparing', 'ready']);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} active orders.`);
  console.log(data);
  
  // Also get shops to see which owner owns which shop
  const { data: shops } = await supabase.from('shops').select('id, owner_id, name');
  console.log("\nShops:");
  console.log(shops);
}

checkOrders();
