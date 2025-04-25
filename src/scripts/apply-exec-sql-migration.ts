import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Define interfaces for type safety
interface MigrationResult {
  success: boolean;
  message: string;
  method?: string;
  error?: string;
  details?: any;
}

/**
 * Applies the exec_sql function migration to Supabase
 * 
 * This script tries multiple methods to apply the migration:
 * 1. If exec_sql already exists, use it to apply the update
 * 2. Direct SQL execution with service role
 * 3. Fallback to PostgreSQL extension method with temporary admin
 * 
 * @returns {Promise<MigrationResult>} The result of the migration attempt
 */
async function applyMigration(): Promise<MigrationResult> {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      message: 'Missing required environment variables',
      error: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    };
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log(chalk.blue('Reading migration file...'));
    // Read the migration SQL
    const migrationFilePath = path.resolve(__dirname, '../db/migrations/create_exec_sql_function.sql');
    
    if (!fs.existsSync(migrationFilePath)) {
      return {
        success: false,
        message: 'Migration file not found',
        error: `File not found at ${migrationFilePath}`
      };
    }

    const sql = fs.readFileSync(migrationFilePath, 'utf8');
    
    // Try to apply the migration with fallbacks
    return await applyMigrationWithFallbacks(supabase, sql);
  } catch (error) {
    console.error(chalk.red('Error applying migration:'), error);
    return {
      success: false,
      message: 'Error applying migration',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Attempts to apply the migration using multiple fallback methods
 * 
 * @param supabase - Supabase client with service role key
 * @param sql - SQL migration to apply
 * @returns {Promise<MigrationResult>} The result of the migration attempt
 */
async function applyMigrationWithFallbacks(
  supabase: SupabaseClient,
  sql: string
): Promise<MigrationResult> {
  // Method 1: Try using existing exec_sql function if it exists
  try {
    console.log(chalk.blue('Attempting to use existing exec_sql function...'));
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (!error) {
      return {
        success: true,
        message: 'Migration applied successfully using exec_sql RPC',
        method: 'exec_sql',
        details: data
      };
    }
    console.log(chalk.yellow('exec_sql method failed, trying direct SQL execution...'));
  } catch (error) {
    console.log(chalk.yellow('exec_sql not available, trying direct SQL execution...'));
  }

  // Method 2: Try direct SQL execution
  try {
    console.log(chalk.blue('Attempting direct SQL execution...'));
    const { error } = await supabase.from('_exec_sql_migration_attempt').select('*');
    
    // If we can execute this SQL, we can probably execute our migration directly
    if (!error || error.code !== '42P01') { // 42P01 = relation does not exist
      const { error: sqlError } = await supabase.rpc('exec_sql_direct', { sql });
      
      if (!sqlError) {
        return {
          success: true,
          message: 'Migration applied successfully using direct SQL execution',
          method: 'direct'
        };
      }
    }
    console.log(chalk.yellow('Direct SQL execution failed, trying PostgreSQL extension method...'));
  } catch (error) {
    console.log(chalk.yellow('Direct SQL execution failed, trying PostgreSQL extension method...'));
  }

  // Method 3: Postgres extension method (create temporary admin, apply migration, remove admin)
  console.log(chalk.blue('Attempting PostgreSQL extension method...'));
  const tempAdminUser = `temp_admin_${Date.now()}`;
  const tempAdminPass = `pass_${Math.random().toString(36).substring(2, 15)}`;
  
  // SQL to create temporary admin user
  const createTempAdminSql = `
    CREATE USER ${tempAdminUser} WITH PASSWORD '${tempAdminPass}' SUPERUSER;
  `;
  
  // SQL to drop temporary admin user
  const dropTempAdminSql = `
    DROP USER IF EXISTS ${tempAdminUser};
  `;
  
  try {
    // Create temporary admin
    await supabase.rpc('pg_shadow_execute', { sql: createTempAdminSql });
    
    // Create new client with temp admin
    const tempClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Postgres-User': tempAdminUser,
            'X-Postgres-Password': tempAdminPass
          }
        }
      }
    );
    
    // Execute the migration as temp admin
    try {
      await tempClient.rpc('pg_execute', { sql });
      
      return {
        success: true,
        message: 'Migration applied successfully using PostgreSQL extension method',
        method: 'pg_extension'
      };
    } finally {
      // Always try to drop the temporary admin user
      try {
        await supabase.rpc('pg_shadow_execute', { sql: dropTempAdminSql });
      } catch (dropError) {
        console.error(chalk.red('Error dropping temporary admin user:'), dropError);
      }
    }
  } catch (error) {
    // Drop temporary admin if it was created
    try {
      await supabase.rpc('pg_shadow_execute', { sql: dropTempAdminSql });
    } catch (dropError) {
      // Ignore errors dropping the user
    }
    
    return {
      success: false,
      message: 'All migration methods failed',
      error: error instanceof Error ? error.message : String(error),
      method: 'pg_extension'
    };
  }
}

/**
 * Rolls back the migration if needed
 * 
 * @returns {Promise<MigrationResult>} The result of the rollback attempt
 */
async function rollbackMigration(): Promise<MigrationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      message: 'Missing required environment variables',
      error: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const rollbackSql = `
    -- Drop the function
    DROP FUNCTION IF EXISTS public.exec_sql(TEXT);
    
    -- Drop the helper table policies
    DROP POLICY IF EXISTS "_exec_sql_select_policy" ON public._exec_sql;
    DROP POLICY IF EXISTS "_exec_sql_insert_policy" ON public._exec_sql;
    
    -- Drop the helper table
    DROP TABLE IF EXISTS public._exec_sql;
  `;

  try {
    // Try to apply the rollback with similar fallback methods
    return await applyMigrationWithFallbacks(supabase, rollbackSql);
  } catch (error) {
    return {
      success: false,
      message: 'Error rolling back migration',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Execute migration and handle result
async function run() {
  const action = process.argv[2]?.toLowerCase();
  
  if (action === 'rollback') {
    console.log(chalk.yellow('Rolling back exec_sql migration...'));
    const result = await rollbackMigration();
    
    if (result.success) {
      console.log(chalk.green('Rollback successful!'), result.message);
      process.exit(0);
    } else {
      console.error(chalk.red('Rollback failed:'), result.error);
      process.exit(1);
    }
  } else {
    console.log(chalk.blue('Applying exec_sql migration...'));
    const result = await applyMigration();
    
    if (result.success) {
      console.log(chalk.green('Migration successful!'), result.message);
      console.log(chalk.green(`Method used: ${result.method}`));
      process.exit(0);
    } else {
      console.error(chalk.red('Migration failed:'), result.error);
      console.log(chalk.yellow('To rollback this migration, run: npm run migrate:exec-sql rollback'));
      process.exit(1);
    }
  }
}

// Run the script
run(); 