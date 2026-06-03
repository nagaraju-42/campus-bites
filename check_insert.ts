import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'orders' });
  console.log("Policies:", data);
}

// Alternatively, let's just use postgres to query pg_policies
async function directQuery() {
  const { data, error } = await supabase.from('orders').select('id').limit(1);
  console.log("Can select?", !error);
}

directQuery();
