import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Define types
type MigrationResult = {
  name: string;
  success: boolean;
  error?: string;
};

async function main() {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set'
    );
    process.exit(1);
  }

  // Create Supabase client with service role key (required for migrations)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔄 Applying migrations...');

  // Get all SQL migration files
  const migrationsDir = path.join(__dirname, '..', 'lib', 'migrations');
  
  try {
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log(`Created migrations directory at ${migrationsDir}`);
    }
    
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Apply each migration
    const results: MigrationResult[] = [];
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`Applying migration: ${file}`);
      
      try {
        // Execute the migration SQL directly
        const { error } = await supabase.rpc('postgres_query', { 
          query: sql 
        });
        
        if (error) throw error;
        
        console.log(`✅ Successfully applied migration: ${file}`);
        results.push({ name: file, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`❌ Failed to apply migration ${file}: ${errorMessage}`);
        results.push({ name: file, success: false, error: errorMessage });
      }
    }

    // Check if exec_sql is available after migrations
    try {
      const { data, error } = await supabase.rpc('postgres_query', {
        query: `
          SELECT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'exec_sql'
          ) as function_exists;
        `
      });

      if (error) throw error;
      
      const functionExists = data?.[0]?.function_exists;
      
      if (functionExists) {
        console.log('✅ exec_sql function is properly installed');
      } else {
        console.log('⚠️ exec_sql function is still not available. Check migration logs for errors.');
      }
    } catch (err) {
      console.error('Failed to verify exec_sql function:', err);
    }

    // Print summary
    console.log('\n--- Migration Summary ---');
    console.log(`Total: ${results.length}`);
    console.log(`Succeeded: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    
    const failedMigrations = results.filter(r => !r.success);
    if (failedMigrations.length > 0) {
      console.log('\nFailed migrations:');
      failedMigrations.forEach(m => {
        console.log(`- ${m.name}: ${m.error}`);
      });
      process.exit(1);
    }
  } catch (err) {
    console.error('Error applying migrations:', err);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 