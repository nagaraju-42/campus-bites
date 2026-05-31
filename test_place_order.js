const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPlaceOrder() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'student@campusbites.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }

  console.log('Logged in as Student:', authData.user.id);

  const orderNumber = `#CBTEST${Date.now().toString().slice(-6)}`;

  // 1. Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      student_id: authData.user.id,
      shop_id: 'a189f81a-63d7-463d-8ab1-86cc7ceb9201', // Needs a valid shop ID!
      status: 'pending',
      total_amount: 100,
      delivery_fee: 10,
      platform_fee: 5,
      payment_method: 'cash',
      hostel_name: 'Test',
      room_number: '123'
    })
    .select()
    .single();

  if (orderError) {
    console.error('Order Insert Error:', orderError.message);
    // Let's get a valid shop_id
    const { data: shops } = await supabase.from('shops').select('id').limit(1);
    if (shops && shops.length > 0) {
       console.log('Try with shop ID:', shops[0].id);
    }
    return;
  }

  console.log('Order inserted:', order.id);

  // 2. Insert order items
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .insert([{
      order_id: order.id,
      menu_item_id: '00000000-0000-0000-0000-000000000000', // Might fail if foreign key constraint exists
      item_name: 'Test Item',
      quantity: 1,
      unit_price: 100
    }])
    .select();

  if (itemsError) {
    console.error('Order Items Insert Error:', itemsError.message);
  } else {
    console.log('Order items inserted:', items);
  }
}

testPlaceOrder();
