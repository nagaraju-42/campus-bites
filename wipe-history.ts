import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function wipeHistory() {
  console.log('Wiping orders...');
  await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('order_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const { error: e1 } = await supabase.from('rider_earnings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: e2 } = await supabase.from('shop_settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: e3 } = await supabase.from('rider_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('History wiped!');
}

wipeHistory();