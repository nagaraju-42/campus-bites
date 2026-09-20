import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function run() {
  console.log('Fetching all menu items...')
  const { data, error } = await supabase.from('menu_items').select('*')
  if (error) {
    console.error('Error fetching:', error)
    return
  }

  let updatedCount = 0
  for (const item of data) {
    let newPrice = item.price + 10
    
    let newVariants = item.variants
    if (newVariants && Array.isArray(newVariants)) {
      newVariants = newVariants.map(v => {
        return {
          ...v,
          price: v.price + 10
        }
      })
    }

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ price: newPrice, variants: newVariants })
      .eq('id', item.id)

    if (updateError) {
      console.error('Error updating item', item.id, updateError)
    } else {
      updatedCount++
    }
  }

  console.log('Updated ' + updatedCount + ' items.')
}

run()