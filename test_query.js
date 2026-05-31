const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const tables = ['profiles', 'shops', 'orders', 'promotions', 'menu_items'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table ${table} count query failed:`, error.message);
    } else {
      console.log(`📊 Table ${table} has ${count} rows`);
    }
  }

  // Let's also fetch promotions if there are any
  const { data: promos } = await supabase.from('promotions').select('*');
  console.log('Promotions:', promos);

  // Let's also fetch profiles
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profs);
}

main();
