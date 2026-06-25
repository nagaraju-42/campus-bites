const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use ANON key to simulate a normal user
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('owner_id')
    .limit(1);

  console.log("SHOPS DATA:", data);
  console.log("ERROR:", error);
}
checkShops();
