import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ksrMenu = [
  // Veg Noodles
  { category: 'Veg Noodles', name: 'Veg Noodles', is_veg: true, single: 70, full: 120 },
  { category: 'Veg Noodles', name: 'Veg Sehezwan Noodles', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Noodles', name: 'Veg Hakka Noodles', is_veg: true, single: 70, full: 120 },
  { category: 'Veg Noodles', name: 'Panner Noodles', is_veg: true, single: 90, full: 160 },
  { category: 'Veg Noodles', name: 'Veg Manchurian Noodles', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Noodles', name: 'Veg Garlic Noodles', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Noodles', name: 'Veg Soft Noodles', is_veg: true, single: 70, full: 120 },

  // Veg (Fried Rice)
  { category: 'Veg Fried Rice', name: 'Veg Fried Rice', is_veg: true, single: 70, full: 120 },
  { category: 'Veg Fried Rice', name: 'Veg Sehezwan Rice', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Fried Rice', name: 'Panner Fried Rice', is_veg: true, single: 90, full: 160 },
  { category: 'Veg Fried Rice', name: 'Veg Manchurian Fried Rice', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Fried Rice', name: 'Veg Garlic Fried Rice', is_veg: true, single: 90, full: 160 },
  { category: 'Veg Fried Rice', name: 'Veg Sehezwan Manchurian Rice', is_veg: true, single: 100, full: 180 },
  { category: 'Veg Fried Rice', name: 'Zeera Rice', is_veg: true, single: 70, full: 120 },

  // Veg Starters
  { category: 'Veg Starters', name: 'Veg Manchurian', is_veg: true, single: 80, full: 140 },
  { category: 'Veg Starters', name: 'Egg Manchurian', is_veg: false, single: 90, full: 160 },
  { category: 'Veg Starters', name: 'Veg Crispy', is_veg: true, single: 120, full: 220 },
  { category: 'Veg Starters', name: 'Manchurian 65', is_veg: true, single: 100, full: 180 },

  // Parotta
  { category: 'Parotta', name: 'Chicken Parotta', is_veg: false, single: 80 },
  { category: 'Parotta', name: 'Veg Parotta', is_veg: true, single: 60 },
  { category: 'Parotta', name: 'Omelet 2 eggs', is_veg: false, single: 50 },
  { category: 'Parotta', name: 'Egg Burji 2 eggs', is_veg: false, single: 70 },

  // Noodles
  { category: 'Noodles', name: 'Egg Noodles', is_veg: false, single: 80, full: 140 },
  { category: 'Noodles', name: 'Double Egg Noodles', is_veg: false, single: 90, full: 160 },
  { category: 'Noodles', name: 'Chicken Noodles', is_veg: false, single: 90, full: 160 },
  { category: 'Noodles', name: 'Chicken Garlic Noodles', is_veg: false, single: 100, full: 180 },
  { category: 'Noodles', name: 'Chicken Sehezwan Noodles', is_veg: false, single: 100, full: 180 },
  { category: 'Noodles', name: 'Chicken Tripple Noodles', is_veg: false, single: 130, full: 240 },
  { category: 'Noodles', name: 'Chicken Hakka Noodles', is_veg: false, single: 100, full: 180 },
  { category: 'Noodles', name: 'Egg Schezwan Noodles', is_veg: false, single: 90, full: 160 },
  { category: 'Noodles', name: 'Double Egg Sehezwan Noodles', is_veg: false, single: 100, full: 180 },

  // Rice Items
  { category: 'Rice Items', name: 'Chicken Fried Rice', is_veg: false, single: 90, full: 160 },
  { category: 'Rice Items', name: 'Chicken Schezwan Fried Rice', is_veg: false, single: 100, full: 180 },
  { category: 'Rice Items', name: 'Chicken Tripple Fried Rice', is_veg: false, single: 130, full: 240 },
  { category: 'Rice Items', name: 'Chicken Garlic Fried Rice', is_veg: false, single: 100, full: 180 },
  { category: 'Rice Items', name: 'Egg Fried Rice', is_veg: false, single: 80, full: 140 },
  { category: 'Rice Items', name: 'Double Egg Fried Rice', is_veg: false, single: 90, full: 160 },
  { category: 'Rice Items', name: 'Egg Schezwan Fried Rice', is_veg: false, single: 90, full: 160 },
  { category: 'Rice Items', name: 'Egg Manchurian Fried Rice', is_veg: false, single: 90, full: 160 },

  // Starter Chicken Items
  { category: 'Starter Chicken Items', name: 'Chicken Manchurian', is_veg: false, single: 130, full: 250 },
  { category: 'Starter Chicken Items', name: 'Chicken 65', is_veg: false, single: 140, full: 260 },
  { category: 'Starter Chicken Items', name: 'Chilli Chicken', is_veg: false, single: 140, full: 280 },
  { category: 'Starter Chicken Items', name: 'Chicken Crispy', is_veg: false, single: 150, full: 280 },
  { category: 'Starter Chicken Items', name: 'Chicken Majestic', is_veg: false, single: 160, full: 300 },
  { category: 'Starter Chicken Items', name: 'Chicken Garlic', is_veg: false, single: 160, full: 300 },
];

async function insertMenu() {
  const { data: shop, error: shopErr } = await supabase.from('shops').select('id').eq('name', 'KSR Food Court').single();
  if (shopErr || !shop) {
    console.error("Shop not found", shopErr);
    return;
  }
  const shopId = shop.id;

  await supabase.from('menu_items').delete().eq('shop_id', shopId);

  for (const item of ksrMenu) {
    const margin = 10;
    
    let variants = [];
    if (item.full) {
      variants = [
        { name: 'Single', price: item.single + margin, is_available: true },
        { name: 'Full', price: item.full + margin, is_available: true }
      ];
    }
    
    const basePrice = item.single + margin;

    const { error } = await supabase.from('menu_items').insert({
      shop_id: shopId,
      name: item.name,
      description: null,
      price: basePrice,
      is_veg: item.is_veg,
      category: item.category,
      is_available: true,
      image_url: null,
      variants: variants.length > 0 ? variants : null
    });
    
    if (error) {
      console.error('Error inserting', item.name, error);
    }
  }
  
  console.log('Inserted KSR Food Court menu items successfully!');
}

insertMenu();