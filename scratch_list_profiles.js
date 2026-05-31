const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('📡 Fetching profiles from database...');
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role, full_name')
    .limit(20);

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    process.exit(1);
  }

  console.log('\n👤 --- Existing Profiles ---');
  data.forEach(p => {
    console.log(`- Name: ${p.full_name.padEnd(20)} | Role: ${p.role.padEnd(12)} | Email: ${p.email}`);
  });
  console.log('----------------------------\n');
}

main();
