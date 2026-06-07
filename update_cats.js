require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function updateCategoryOrder() {
  const desiredOrder = ['Fast Food', 'Curries', 'Drinks', 'Icecreams', 'Snacks']
  for (let i = 0; i < desiredOrder.length; i++) {
    const name = desiredOrder[i]
    // The user may have lowercase or uppercase, let's use ilike
    const { data } = await supabase.from('app_categories').select('id').ilike('name', name)
    if (data && data.length > 0) {
      await supabase.from('app_categories').update({ display_order: i + 1 }).eq('id', data[0].id)
      console.log(`Updated ${name} to order ${i + 1}`)
    } else {
      console.log(`Category ${name} not found`)
    }
  }
}

updateCategoryOrder()
