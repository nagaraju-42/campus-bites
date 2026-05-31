const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ACCOUNTS = [
  {
    email: 'admin@campusbites.com',
    password: 'password123',
    full_name: 'System Admin',
    role: 'admin'
  },
  {
    email: 'shop@campusbites.com',
    password: 'password123',
    full_name: 'Shop Owner',
    role: 'shop_owner'
  },
  {
    email: 'rider@campusbites.com',
    password: 'password123',
    full_name: 'Rider Partner',
    role: 'rider'
  },
  {
    email: 'student@campusbites.com',
    password: 'password123',
    full_name: 'Test Student',
    role: 'student'
  }
];

async function seed() {
  console.log('🌱 Starting account seeding...');
  
  for (const account of ACCOUNTS) {
    console.log(`👤 Registering ${account.role}: ${account.email}...`);
    
    // First, let's sign out to ensure clean state
    await supabase.auth.signOut();
    
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.full_name,
          role: account.role
        }
      }
    });
    
    if (error) {
      // If user already exists, let's try to sign them in, and then update their role
      if (error.message.includes('already registered')) {
        console.log(`ℹ️ ${account.email} already exists. Updating role in profile...`);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });
        
        if (signInError) {
          console.error(`❌ Sign in failed for existing user: ${signInError.message}`);
          continue;
        }
        
        // Update role directly in profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: account.role })
          .eq('id', signInData.user.id);
          
        if (updateError) {
          console.error(`❌ Failed to update profile role: ${updateError.message}`);
        } else {
          console.log(`✅ Role successfully set to ${account.role} for existing user!`);
        }
      } else {
        console.error(`❌ Failed to register ${account.email}: ${error.message}`);
      }
    } else if (data.user) {
      console.log(`✅ Registered successfully! User ID: ${data.user.id}`);
      
      // Let's make sure the role was correctly written to the profiles table
      // (some Supabase triggers might not copy metadata instantly or might fail)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: account.role, full_name: account.full_name })
        .eq('id', data.user.id);
        
      if (updateError) {
        console.error(`❌ Profile update failed: ${updateError.message}`);
      } else {
        console.log(`✅ Profile verified for ${account.role}!`);
      }

      // If it is a student, we also need to create student_profiles
      if (account.role === 'student') {
        const { error: spError } = await supabase
          .from('student_profiles')
          .insert({
            id: data.user.id,
            college_name: 'Anurag University',
            hostel_name: 'Boys Hostel Block A',
            room_number: 'Room 203'
          });
        if (spError) {
          console.error(`❌ Student profile insert failed: ${spError.message}`);
        } else {
          console.log(`✅ Student profile created!`);
        }
      }
    }
  }
  
  console.log('🌱 Seeding complete! All profiles are ready.');
}

seed();
