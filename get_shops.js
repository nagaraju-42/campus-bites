const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getShops() {
  const { data: shops, error: shopsErr } = await supabase.from('shops').select('name, owner_id');
  if (shopsErr) { console.error(shopsErr); return; }

  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) { console.error(usersErr); return; }

  for (const shop of shops) {
    const user = users.users.find(u => u.id === shop.owner_id);
    console.log(`Shop: ${shop.name} | Owner Email: ${user ? user.email : 'Unknown'}`);
  }
}

getShops();
