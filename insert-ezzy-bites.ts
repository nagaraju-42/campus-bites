import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const menu = [
  { "category": "Maggi", "name": "Plain Maggi", "price": 59, "variants": [{ "name": "Wet", "price": 59, "is_available": true }, { "name": "Fried", "price": 59, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Veggie Maggi", "price": 69, "variants": [{ "name": "Wet", "price": 69, "is_available": true }, { "name": "Fried", "price": 69, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Masala Maggi", "price": 69, "variants": [{ "name": "Wet", "price": 69, "is_available": true }, { "name": "Fried", "price": 69, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Schezwan Maggi", "price": 79, "variants": [{ "name": "Wet", "price": 79, "is_available": true }, { "name": "Fried", "price": 79, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Cheese Maggi", "price": 79, "variants": [{ "name": "Wet", "price": 79, "is_available": true }, { "name": "Fried", "price": 79, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Veg. Cheese Maggi", "price": 79, "variants": [{ "name": "Wet", "price": 79, "is_available": true }, { "name": "Fried", "price": 79, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Schezwan Cheese Maggi", "price": 89, "variants": [{ "name": "Wet", "price": 89, "is_available": true }, { "name": "Fried", "price": 89, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Butter Maggi", "price": 80, "variants": [{ "name": "Wet", "price": 80, "is_available": true }, { "name": "Fried", "price": 80, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Panner Maggi", "price": 80, "variants": [{ "name": "Wet", "price": 80, "is_available": true }, { "name": "Fried", "price": 80, "is_available": true }], "is_veg": true },
  { "category": "Maggi", "name": "Panner Butter Maggi", "price": 100, "variants": [{ "name": "Wet", "price": 100, "is_available": true }, { "name": "Fried", "price": 100, "is_available": true }], "is_veg": true },
  
  { "category": "Non-Veg Maggi", "name": "Egg Maggi", "price": 69, "variants": [{ "name": "Wet", "price": 69, "is_available": true }, { "name": "Fried", "price": 69, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Double Egg Maggi", "price": 80, "variants": [{ "name": "Wet", "price": 80, "is_available": true }, { "name": "Fried", "price": 80, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Maggi", "price": 90, "variants": [{ "name": "Wet", "price": 90, "is_available": true }, { "name": "Fried", "price": 90, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Egg Maggi", "price": 99, "variants": [{ "name": "Wet", "price": 99, "is_available": true }, { "name": "Fried", "price": 99, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Double Egg Chicken Maggi", "price": 109, "variants": [{ "name": "Wet", "price": 109, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Egg Potlam Maggi", "price": 99, "variants": [{ "name": "Wet", "price": 99, "is_available": true }, { "name": "Fried", "price": 99, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Potlam Maggi", "price": 129, "variants": [{ "name": "Wet", "price": 129, "is_available": true }, { "name": "Fried", "price": 129, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Schezwan Maggi", "price": 109, "variants": [{ "name": "Wet", "price": 109, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Cheese Maggi", "price": 109, "variants": [{ "name": "Wet", "price": 109, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Maggi", "name": "Chicken Popcorn Maggi", "price": 149, "variants": [{ "name": "Wet", "price": 149, "is_available": true }, { "name": "Fried", "price": 149, "is_available": true }], "is_veg": false },
  
  { "category": "Veg Momos", "name": "Veg Momos", "price": 79, "variants": [{ "name": "Steamed", "price": 79, "is_available": true }, { "name": "Fried", "price": 89, "is_available": true }], "is_veg": true },
  { "category": "Veg Momos", "name": "Panner Tikka Momos", "price": 99, "variants": [{ "name": "Steamed", "price": 99, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": true },
  { "category": "Veg Momos", "name": "Mushroom Butter Momos", "price": 99, "variants": [{ "name": "Steamed", "price": 99, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": true },
  { "category": "Veg Momos", "name": "Mushroom Malai Momos", "price": 99, "variants": [{ "name": "Steamed", "price": 99, "is_available": true }, { "name": "Fried", "price": 109, "is_available": true }], "is_veg": true },

  { "category": "Special Non-Veg Momos", "name": "Chicken Tikka Momos", "price": 119, "variants": [{ "name": "Steamed", "price": 119, "is_available": true }, { "name": "Fried", "price": 129, "is_available": true }], "is_veg": false },
  { "category": "Special Non-Veg Momos", "name": "Malai Chicken Momos", "price": 129, "variants": [{ "name": "Steamed", "price": 129, "is_available": true }, { "name": "Fried", "price": 139, "is_available": true }], "is_veg": false },
  { "category": "Special Non-Veg Momos", "name": "Butter Chicken Momos", "price": 129, "variants": [{ "name": "Steamed", "price": 129, "is_available": true }, { "name": "Fried", "price": 139, "is_available": true }], "is_veg": false },
  { "category": "Special Non-Veg Momos", "name": "Prawns Tikka Momos", "price": 139, "variants": [{ "name": "Steamed", "price": 139, "is_available": true }, { "name": "Fried", "price": 149, "is_available": true }], "is_veg": false },
  { "category": "Special Non-Veg Momos", "name": "Butter Prawns Momos", "price": 149, "variants": [{ "name": "Steamed", "price": 149, "is_available": true }, { "name": "Fried", "price": 149, "is_available": true }], "is_veg": false },

  { "category": "Bread Omelette", "name": "Omelette", "price": 50, "is_veg": false },
  { "category": "Bread Omelette", "name": "Butter Omelette", "price": 60, "is_veg": false },
  { "category": "Bread Omelette", "name": "Bread Omelette", "price": 70, "is_veg": false },
  { "category": "Bread Omelette", "name": "Butter-Bread Omelette", "price": 80, "is_veg": false },
  { "category": "Bread Omelette", "name": "Cheese Bread Omelette", "price": 80, "is_veg": false },
  { "category": "Bread Omelette", "name": "Masala Bread Omelette", "price": 80, "is_veg": false },
  { "category": "Bread Omelette", "name": "Chicken Bread Omelette", "price": 90, "is_veg": false },
  { "category": "Bread Omelette", "name": "Chicken Cheese Bread", "price": 100, "is_veg": false },

  { "category": "French Fries", "name": "Plain Fries", "price": 69, "is_veg": true },
  { "category": "French Fries", "name": "Peri Peri Fries", "price": 79, "is_veg": true },
  { "category": "French Fries", "name": "Cheese Fries", "price": 89, "is_veg": true },

  { "category": "Veg Starters", "name": "Veg Manchurian", "price": 90, "variants": [{ "name": "Single", "price": 90, "is_available": true }, { "name": "Full", "price": 140, "is_available": true }], "is_veg": true },
  { "category": "Veg Starters", "name": "Panner Manchurian", "price": 120, "variants": [{ "name": "Single", "price": 120, "is_available": true }, { "name": "Full", "price": 200, "is_available": true }], "is_veg": true },
  { "category": "Veg Starters", "name": "Panner65", "price": 130, "variants": [{ "name": "Single", "price": 130, "is_available": true }, { "name": "Full", "price": 220, "is_available": true }], "is_veg": true },
  { "category": "Veg Starters", "name": "Chilly Panner", "price": 130, "variants": [{ "name": "Single", "price": 130, "is_available": true }, { "name": "Full", "price": 220, "is_available": true }], "is_veg": true },

  { "category": "Non-Veg Starters", "name": "Chicken Manchurian", "price": 130, "variants": [{ "name": "Single", "price": 130, "is_available": true }, { "name": "Full", "price": 210, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Chicken 65", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 220, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Chilly Chicken", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 230, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Chicken Lollipop", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 240, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Chicken Lollipop Masala", "price": 150, "variants": [{ "name": "Single", "price": 150, "is_available": true }, { "name": "Full", "price": 240, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Pepper Chicken", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 250, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Starters", "name": "Chicken Garlic", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 250, "is_available": true }], "is_veg": false },

  { "category": "Veg Noodles", "name": "Veg Noodles", "price": 90, "variants": [{ "name": "Single", "price": 90, "is_available": true }, { "name": "Full", "price": 140, "is_available": true }], "is_veg": true },
  { "category": "Veg Noodles", "name": "Veg Manchurian Noodles", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 150, "is_available": true }], "is_veg": true },
  { "category": "Veg Noodles", "name": "Veg Schezwan Noodles", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 160, "is_available": true }], "is_veg": true },
  { "category": "Veg Noodles", "name": "Panner Noodles", "price": 120, "variants": [{ "name": "Single", "price": 120, "is_available": true }, { "name": "Full", "price": 190, "is_available": true }], "is_veg": true },
  { "category": "Veg Noodles", "name": "Veg Garlic Noodles", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 160, "is_available": true }], "is_veg": true },

  { "category": "Non-Veg Noodles", "name": "Egg Noodles", "price": 90, "variants": [{ "name": "Single", "price": 90, "is_available": true }, { "name": "Full", "price": 140, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Noodles", "name": "Double Egg Noodles", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 160, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Noodles", "name": "Chicken Noodles", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 170, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Noodles", "name": "Chicken Schezwan Noodles", "price": 120, "variants": [{ "name": "Single", "price": 120, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Noodles", "name": "Chicken Chilly Noodles", "price": 140, "variants": [{ "name": "Single", "price": 140, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Noodles", "name": "Double Egg Chicken Noodles", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": false },

  { "category": "Veg Rice Items", "name": "Veg Fried Rice", "price": 90, "variants": [{ "name": "Single", "price": 90, "is_available": true }, { "name": "Full", "price": 140, "is_available": true }], "is_veg": true },
  { "category": "Veg Rice Items", "name": "Panner Fried Rice", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": true },
  { "category": "Veg Rice Items", "name": "Veg Manchurian Rice", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 160, "is_available": true }], "is_veg": true },
  { "category": "Veg Rice Items", "name": "Veg Schezwan Rice", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 160, "is_available": true }], "is_veg": true },

  { "category": "Non-Veg Rice Items", "name": "Egg Fried Rice", "price": 90, "variants": [{ "name": "Single", "price": 90, "is_available": true }, { "name": "Full", "price": 140, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Rice Items", "name": "Double Egg Fried Rice", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 170, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Rice Items", "name": "Chicken Fried Rice", "price": 100, "variants": [{ "name": "Single", "price": 100, "is_available": true }, { "name": "Full", "price": 170, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Rice Items", "name": "Chicken Schezwan Rice", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": false },
  { "category": "Non-Veg Rice Items", "name": "Double Egg Chicken Rice", "price": 110, "variants": [{ "name": "Single", "price": 110, "is_available": true }, { "name": "Full", "price": 180, "is_available": true }], "is_veg": false }
]

async function run() {
  const { data: shop } = await supabase.from('shops').select('id').eq('name', 'Ezzy Bites').single()
  if (!shop) {
    console.log('Shop not found')
    return
  }

  // Insert categories
  const categories = Array.from(new Set(menu.map(m => m.category)))
  
  const { data: shopData } = await supabase.from('shops').select('categories').eq('id', shop.id).single()
  const existingCategories = shopData?.categories || []
  
  const updatedCategories = Array.from(new Set([...existingCategories, ...categories]))
  await supabase.from('shops').update({ categories: updatedCategories }).eq('id', shop.id)

  let successCount = 0
  for (const item of menu) {
    const { error } = await supabase.from('menu_items').insert({
      shop_id: shop.id,
      name: item.name,
      description: item.category,
      price: item.price,
      is_veg: item.is_veg,
      category: item.category,
      is_available: true,
      variants: item.variants || null
    })
    if (error) console.error('Error inserting', item.name, error)
    else successCount++
  }
  
  console.log('Inserted ' + successCount + ' items into Ezzy Bites!')
}

run()