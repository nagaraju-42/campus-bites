const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔑 Attempting admin sign-in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@campusbites.com',
    password: 'password123'
  });

  if (error) {
    console.error('❌ Sign-in failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Sign-in successful! User ID:', data.user.id);

  console.log('📡 Fetching profile role...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile query failed:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Profile role:', profile.role);
}

main();
