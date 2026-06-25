const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('notifications').select('title, message').order('created_at', { ascending: false }).limit(5).then(res => {
  if (res.error) console.error("ERROR:", res.error);
  else console.log("DATA:", res.data);
});
