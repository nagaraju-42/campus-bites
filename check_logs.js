require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('order_audit_logs').select('*')
  console.log('Error:', error)
  console.log('Logs count:', data?.length)
  if (data?.length > 0) {
    console.log('Sample log:', data[0])
  }
}

check()
