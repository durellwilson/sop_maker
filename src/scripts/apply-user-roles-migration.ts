import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Script to apply the user_roles migration to the Supabase database
 * This creates the user_roles table and associated functions
 * 
 * Usage: 
 * - You need to have SUPABASE_SERVICE_ROLE_KEY in your environment
 * - Run with ts-node or bun: `bun run src/scripts/apply-user-roles-migration.ts`
 */
async function applyUserRolesMigration() {
  console.log('📊 Applying user_roles migration...');

  try {
    // Read migration file
    const migrationPath = path.resolve(process.cwd(), 'migrations/04_create_user_roles_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Get Supabase client with admin privileges
    const supabase = createAdminClient();
    
    // Apply migration using execute SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: migrationSql
    });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
    
    console.log('✅ User roles migration applied successfully');
    
    // Check if any admin users are defined
    const { data: existingAdmins, error: queryError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
      
    if (queryError) {
      console.warn('⚠️ Could not check for existing admin users:', queryError.message);
    } else if (!existingAdmins || existingAdmins.length === 0) {
      console.warn('⚠️ No admin users found! You should manually add at least one admin user.');
      console.log('   Run: INSERT INTO public.user_roles (user_id, role) VALUES (\'your-user-id\', \'admin\');');
    } else {
      console.log(`ℹ️ Found ${existingAdmins.length} admin user(s)`);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

// Run the migration
applyUserRolesMigration(); 