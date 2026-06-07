require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function runMigration() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.shop_reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
        student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        fake_name TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Enable RLS
    ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;

    -- Policy: Anyone can read reviews
    CREATE POLICY "Public reviews are viewable by everyone." ON public.shop_reviews FOR SELECT USING (true);

    -- Policy: Authenticated users can insert their own reviews
    CREATE POLICY "Users can insert their own reviews." ON public.shop_reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
    
    -- Note: Admins can bypass RLS via Service Role for adding fake reviews and deleting
  `

  const { error } = await supabase.rpc('exec_sql', { sql_string: sql })
  
  if (error) {
    console.error("Migration via RPC failed. Trying direct query if possible, or manual execution needed.", error)
    // If we don't have exec_sql RPC, we might just try to run it via REST if supported, or inform the user to run it.
  } else {
    console.log("Migration successful!")
  }
}

runMigration()
