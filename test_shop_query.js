const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testShopQuery() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'shop@campusbites.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  console.log('Logged in as:', authData.user.id);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .limit(3);
    
  console.log('Orders:', JSON.stringify(orders, null, 2));
}

testShopQuery();
