const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokens() {
  const { data, error } = await supabaseAdmin.from('profiles').select('id, fcm_token');
  console.log(data);
}
checkTokens();
