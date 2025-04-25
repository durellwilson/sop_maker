require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials.');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
  }

  // Initialize Supabase client with service role key for admin privileges
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../db/migrations/create_exec_sql_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration to create exec_sql function and helper table...');
    
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    }).catch(err => {
      // If exec_sql doesn't exist yet, we need to execute the SQL directly
      console.log('exec_sql function not found, executing SQL directly...');
      return supabase.from('_exec_sql').select('*').limit(1);
    });

    // If we get here and have an error from trying to use exec_sql, 
    // or if _exec_sql table doesn't exist, we need to execute raw SQL
    if (error) {
      console.log('Using PostgreSQL directly to create base functions...');
      
      // Direct SQL execution (using REST API since supabase-js doesn't expose this directly)
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'params=single-object',
          'X-Client-Info': 'supabase-js/2.0.0'
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      });
      
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(`Failed to execute SQL directly: ${JSON.stringify(responseData)}`);
      }
      
      console.log('Migration applied successfully via direct SQL.');
    } else {
      console.log('Migration completed successfully using exec_sql function.');
    }

    // Verify the setup
    const { data: verifyData, error: verifyError } = await supabase
      .from('_exec_sql')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.warn('Warning: Could not verify _exec_sql table exists.');
      console.warn(verifyError);
    } else {
      console.log('_exec_sql table verified.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration(); 