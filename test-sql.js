import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:/CampusBites/campus-bites/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runSQL() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
      ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Enable read access for all users" ON delivery_locations FOR SELECT USING (true);
      CREATE POLICY "Enable all access for admin" ON delivery_locations FOR ALL USING (true);
    `
  })
  console.log("Adding column:", data, error)
}
runSQL()
