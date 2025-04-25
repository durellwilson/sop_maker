import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nextEnv } from '@/utils/env';

export const dynamic = 'force-dynamic';

// Main function to set up the exec_sql function in the database
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client with the service role key (has admin privileges)
    const supabase = createClient(
      nextEnv.supabaseUrl,
      nextEnv.supabaseServiceRoleKey
    );

    // First method: try to create the exec_sql function directly
    const { error: directError } = await supabase.query(`
      -- Drop function if it exists to make sure we recreate it
      DROP FUNCTION IF EXISTS exec_sql(text);
      
      -- Create the exec_sql function
      CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE query INTO result;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
          'error', SQLERRM,
          'detail', SQLSTATE
        );
      END;
      $$;
      
      -- Grant execute privileges
      GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
    `);

    if (!directError) {
      // Verify the function was created
      const { data, error: verifyError } = await supabase.query(`
        SELECT proname FROM pg_proc WHERE proname = 'exec_sql';
      `);

      if (verifyError || !data || data.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Failed to verify exec_sql function creation',
          error: verifyError?.message || 'Function not found'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'exec_sql function created successfully'
      });
    }

    // If direct creation failed, try the fallback method using the helper table
    console.log('Direct exec_sql creation failed, trying fallback method...');
    
    // Create the helper table first
    const helperResponse = await fetch(`${request.nextUrl.origin}/api/db-setup/helper-table`);
    const helperResult = await helperResponse.json();
    
    if (!helperResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create helper table for exec_sql function',
        error: helperResult.error
      }, { status: 500 });
    }
    
    // Now use the helper table to create the exec_sql function
    const { data: execData, error: execError } = await supabase
      .from('_exec_sql')
      .insert({
        query: `
          -- Drop function if it exists to make sure we recreate it
          DROP FUNCTION IF EXISTS exec_sql(text);
          
          -- Create the exec_sql function
          CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE query INTO result;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
              'error', SQLERRM,
              'detail', SQLSTATE
            );
          END;
          $$;
          
          -- Grant execute privileges
          GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
          GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
          
          -- Return verification
          SELECT 'exec_sql function created' as status;
        `
      })
      .select()
      .single();

    if (execError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create exec_sql function using helper table',
        error: execError.message
      }, { status: 500 });
    }

    // Check if we got an error in the result
    if (execData.result && execData.result.error) {
      return NextResponse.json({
        success: false,
        message: 'Error while creating exec_sql function',
        error: execData.result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'exec_sql function created successfully using helper table',
      data: execData.result
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    return NextResponse.json({
      success: false,
      message: 'Error setting up database',
      error: err.message
    }, { status: 500 });
  }
} 