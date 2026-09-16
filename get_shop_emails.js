const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS
);

async function main() {
  console.log('📡 Fetching Shop Owners...');
  
  // Try to get profiles with role 'shop_owner'
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'shop_owner');

  if (pError) console.error('Error fetching profiles:', pError);
  
  if (profiles && profiles.length > 0) {
    console.log('\n--- Shop Owner Profiles ---');
    profiles.forEach(p => console.log(`Email: ${p.email} | Name: ${p.full_name}`));
  } else {
    console.log('No shop_owner profiles found in profiles table.');
  }

  // Try to get shops directly
  console.log('\n📡 Fetching Shops Table...');
  const { data: shops, error: sError } = await supabase
    .from('shops')
    .select('*');

  if (sError) console.error('Error fetching shops:', sError);
  
  if (shops && shops.length > 0) {
    console.log('\n--- Registered Shops ---');
    shops.forEach(s => console.log(`Shop: ${s.name} | Owner Email: ${s.owner_email || 'N/A'}`));
  } else {
    console.log('No shops found in shops table.');
  }
}

main();
