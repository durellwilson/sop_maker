require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixExecSql() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔧 Fixing exec_sql function...');

  try {
    // SQL to fix the exec_sql function
    const sql = `
      -- Create the helper table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public._exec_sql (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT false,
        result JSONB,
        error TEXT
      );

      -- Drop existing function
      DROP FUNCTION IF EXISTS public.exec_sql(text);
      
      -- Create simplified exec_sql function
      CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        result JSONB;
        start_time TIMESTAMPTZ;
        end_time TIMESTAMPTZ;
        execution_time INTEGER;
        success BOOLEAN := false;
        error_message TEXT;
        exec_id INTEGER;
      BEGIN
        -- Record start time
        start_time := clock_timestamp();
        
        BEGIN
          -- Execute the query
          EXECUTE query INTO result;
          success := true;
          
          -- Handle case where query doesn't return anything
          IF result IS NULL THEN
            result := jsonb_build_object('message', 'Query executed successfully with no results');
          END IF;
          
          EXCEPTION WHEN OTHERS THEN
            -- Capture error
            success := false;
            error_message := SQLERRM;
            result := NULL;
        END;
        
        -- Record end time and calculate duration
        end_time := clock_timestamp();
        execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- Log the execution to the tracking table
        INSERT INTO public._exec_sql (
          query, 
          execution_time_ms, 
          success, 
          result, 
          error
        ) VALUES (
          query, 
          execution_time, 
          success, 
          result, 
          error_message
        ) RETURNING id INTO exec_id;
        
        -- Return appropriate result
        IF success THEN
          RETURN jsonb_build_object(
            'success', true,
            'execution_id', exec_id,
            'execution_time_ms', execution_time,
            'result', result
          );
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'execution_id', exec_id,
            'execution_time_ms', execution_time,
            'error', error_message
          );
        END IF;
      END;
      $$;

      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
      GRANT ALL ON TABLE public._exec_sql TO authenticated;
      GRANT ALL ON TABLE public._exec_sql TO service_role;
    `;

    // Apply the SQL directly
    console.log('Executing SQL to fix exec_sql function...');
    const { error } = await supabase.rpc('postgres_query', { query: sql });
    
    if (error) {
      throw error;
    }
    
    // Verify the function exists
    console.log('Verifying exec_sql function was created...');
    const { data, error: verifyError } = await supabase.rpc('postgres_query', {
      query: `
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'exec_sql'
        ) as function_exists;
      `
    });

    if (verifyError) {
      throw verifyError;
    }
    
    const functionExists = data?.[0]?.function_exists;
    
    if (functionExists) {
      console.log('✅ exec_sql function fixed and is now available!');
      console.log('👉 You can now run: npm run db:migrate');
    } else {
      console.log('❌ Could not verify exec_sql function creation.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error fixing exec_sql function:', err);
    process.exit(1);
  }
}

// Run the fix function
fixExecSql(); 