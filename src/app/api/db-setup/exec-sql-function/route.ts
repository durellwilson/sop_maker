import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  // Initialize Supabase client with service role key for administrative operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // First check if the helper table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('_exec_sql')
      .select('id')
      .limit(1)
      .catch(e => ({ data: null, error: e }));

    if (tableError) {
      return NextResponse.json(
        { 
          error: 'Helper table _exec_sql does not exist. Please create it first.',
          details: tableError
        },
        { status: 400 }
      );
    }

    // Create the exec_sql function
    const createFunctionSQL = `
      -- Drop the function if it already exists
      DROP FUNCTION IF EXISTS public.exec_sql(query text);
      
      -- Create the exec_sql function
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
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
        success BOOLEAN;
        error_message TEXT;
        exec_id INTEGER;
      BEGIN
        -- Record start time
        start_time := clock_timestamp();
        success := true;
        
        BEGIN
          -- Execute the query
          EXECUTE query INTO result;
          
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

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

      -- Add comment explaining the function
      COMMENT ON FUNCTION public.exec_sql(text) IS 'Executes arbitrary SQL with logging and error handling. Security definer function that runs with invoker''s permissions.';
    `;

    // Try to create the function using different methods
    
    // First attempt: Use postgres_command if available
    const { data: pgCommandData, error: pgCommandError } = await supabase
      .rpc('postgres_command', { command: createFunctionSQL })
      .catch(e => ({ data: null, error: e }));

    if (!pgCommandError) {
      return NextResponse.json({
        success: true,
        message: 'exec_sql function created successfully using postgres_command',
      });
    }

    // Second attempt: Direct query
    const { data: directData, error: directError } = await supabase
      .auth.admin.executeRawSql(createFunctionSQL)
      .catch(e => ({ data: null, error: e }));

    if (!directError) {
      return NextResponse.json({
        success: true,
        message: 'exec_sql function created successfully using direct SQL',
      });
    }

    // Third attempt: Use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/postgres_command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ command: createFunctionSQL })
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'exec_sql function created successfully using REST API',
      });
    }

    // If all attempts failed
    return NextResponse.json({
      success: false,
      message: 'Failed to create exec_sql function',
      errors: {
        pgCommand: pgCommandError,
        directQuery: directError,
        restApi: await response.text()
      }
    }, { status: 500 });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create exec_sql function',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 