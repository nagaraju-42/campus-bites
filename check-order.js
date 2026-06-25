const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLastOrder() {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, 
      shop_id, 
      shops ( owner_id )
    `)
    .order('placed_at', { ascending: false })
    .limit(1)
    .single();

  console.log("LAST ORDER:", order);
}
checkLastOrder();
