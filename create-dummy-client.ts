import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function run() {
  const s = { name: 'Dummy', description: 'Dummy Shop', email: 'dummy@dinendeliver.com', pass: 'OMNAMAHSHIVAYA8' }
  const sortOrder = 8
  
  let userId = null

  // Find if user already exists in profiles
  const { data: profiles } = await supabase.from('profiles').select('id, email').eq('email', s.email).single()
  
  if (profiles) {
    userId = profiles.id
  } else {
    // Attempt to create user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: s.email,
      password: s.pass,
      email_confirm: true,
      user_metadata: { name: s.name + ' Owner' }
    })
    if (userError) {
      console.error('Error creating user ' + s.name, userError)
      return
    }
    userId = user.user.id
  }

  if (!userId) return;

  await supabase.from('profiles').update({ role: 'shop_owner', name: s.name + ' Owner' }).eq('id', userId)

  // create it
  const { error: shopError } = await supabase.from('shops').insert({
    owner_id: userId,
    name: s.name,
    description: s.description,
    address: 'Anurag University, Jodimetla',
    is_open: false,
    status: 'approved',
    sort_order: sortOrder,
    is_verified: true,
    min_order_amount: 50,
    delivery_fee: 0
  })
  
  if (shopError) console.error('Error creating shop ' + s.name, shopError)
  else console.log('Created Shop: ' + s.name + ' with Email: ' + s.email)
}

run()