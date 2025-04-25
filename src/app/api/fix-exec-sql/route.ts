import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Simplified route to fix the exec_sql function
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase environment variables',
      }, { status: 500 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SQL to create the exec_sql function
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

    // Execute the SQL directly
    const { error } = await supabase.rpc('postgres_query', { query: sql });
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create exec_sql function',
        error: error.message,
      }, { status: 500 });
    }
    
    // Verify the function was created
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
      return NextResponse.json({
        success: false,
        message: 'Failed to verify exec_sql function creation',
        error: verifyError.message,
      }, { status: 500 });
    }
    
    const functionExists = data?.[0]?.function_exists;
    
    if (!functionExists) {
      return NextResponse.json({
        success: false,
        message: 'exec_sql function could not be verified',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'exec_sql function created successfully!',
      data: { functionExists },
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    return NextResponse.json({
      success: false,
      message: 'Error fixing exec_sql function',
      error: err.message,
    }, { status: 500 });
  }
} 