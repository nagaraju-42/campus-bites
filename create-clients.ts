import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const shopsToCreate = [
  { name: 'Ezzy Bites', description: 'Fast Food', email: 'ezzybites@dinendeliver.com', pass: 'OMNAMAHSHIVAYA1' },
  { name: 'KSR Food Court', description: 'South Indian & More', email: 'ksrfoodcourt@dinendeliver.com', pass: 'OMNAMAHSHIVAYA2' },
  { name: 'Curry Point', description: 'Authentic Curries', email: 'currypoint@dinendeliver.com', pass: 'OMNAMAHSHIVAYA3' },
  { name: 'Moksha Bakery', description: 'Fresh & Tasty', email: 'mokshabakery@dinendeliver.com', pass: 'OMNAMAHSHIVAYA4' },
  { name: 'Softy Bakery', description: 'Ice Cream & Desserts', email: 'softybakery@dinendeliver.com', pass: 'OMNAMAHSHIVAYA5' },
  { name: 'Garage Cafe', description: 'Coffee & Snacks', email: 'garagecafe@dinendeliver.com', pass: 'OMNAMAHSHIVAYA6' },
  { name: 'Twilight Shop', description: 'Snacks | Drinks | More', email: 'twilightshop@dinendeliver.com', pass: 'OMNAMAHSHIVAYA7' }
]

async function run() {
  let sortOrder = 1
  for (const s of shopsToCreate) {
    // 1. Create Auth User
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: s.email,
      password: s.pass,
      email_confirm: true,
      user_metadata: { name: s.name + ' Owner' }
    })

    if (userError) {
      console.error('Error creating user ' + s.name, userError)
      continue
    }

    if (!user || !user.user) {
      console.error('No user returned for ' + s.name)
      continue
    }

    const userId = user.user.id

    // 2. Update Profile to shop_owner
    await supabase.from('profiles').update({ role: 'shop_owner', name: s.name + ' Owner' }).eq('id', userId)

    // 3. Create Shop
    const { error: shopError } = await supabase.from('shops').insert({
      owner_id: userId,
      name: s.name,
      description: s.description,
      address: 'Anurag University, Jodimetla',
      is_open: false,
      status: 'active',
      sort_order: sortOrder,
      is_verified: true,
      min_order_amount: 50,
      delivery_fee: 0
    })

    if (shopError) {
      console.error('Error creating shop ' + s.name, shopError)
    } else {
      console.log('Created Shop: ' + s.name + ' with Email: ' + s.email)
    }
    
    sortOrder++
  }
}

run()