import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = `
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own student profile" ON student_profiles;
    CREATE POLICY "Users can update own student profile" ON student_profiles FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own student profile" ON student_profiles;
    CREATE POLICY "Users can insert own student profile" ON student_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  `;
  const {error} = await supabase.rpc('exec_sql', { sql_string: sql });
  console.log(error || 'SQL Executed');
}
run();
