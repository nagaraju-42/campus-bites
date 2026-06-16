require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_unavailable BOOLEAN DEFAULT false;' })
  console.log(error || 'Success')
}
run()
