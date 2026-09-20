import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
  // Fetch all order_items where partner_shop_id is null
  const { data: itemsToFix } = await supabaseAdmin.from('order_items').select('*').is('partner_shop_id', null);
  
  let fixed = 0;
  if (itemsToFix) {
    for (const item of itemsToFix) {
      // Find the real shop_id for this menu_item
      const { data: menuItem } = await supabaseAdmin.from('menu_items').select('shop_id').eq('id', item.menu_item_id).single();
      if (menuItem && menuItem.shop_id) {
        // Find the order to see what the primary shop was
        const { data: order } = await supabaseAdmin.from('orders').select('shop_id').eq('id', item.order_id).single();
        if (order && order.shop_id !== menuItem.shop_id) {
          // This is a partner item! Fix it!
          await supabaseAdmin.from('order_items').update({ partner_shop_id: menuItem.shop_id }).eq('id', item.id);
          fixed++;
        }
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, student:profiles!orders_student_id_fkey(full_name, phone)`)
    .order('placed_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    fixed_count: fixed,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    error: error?.message || null,
    orders: data || []
  });
}


