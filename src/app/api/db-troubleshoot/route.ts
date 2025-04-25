import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nextEnv } from '@/utils/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(
      nextEnv.supabaseUrl,
      nextEnv.supabaseServiceRoleKey
    );
    
    // Check if exec_sql function exists using system catalog
    const { data: functionData, error: functionError } = await supabase.query(`
      SELECT 
        n.nspname AS schema,
        p.proname AS function_name,
        pg_get_function_arguments(p.oid) AS arguments,
        pg_get_function_result(p.oid) AS return_type,
        CASE
          WHEN p.prosecdef THEN 'SECURITY DEFINER'
          ELSE 'SECURITY INVOKER'
        END AS security,
        d.description AS description
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      LEFT JOIN pg_description d ON d.objoid = p.oid
      WHERE p.proname = 'exec_sql'
      ORDER BY n.nspname, p.proname;
    `);

    let result = {
      function_exists: functionData && functionData.length > 0,
      function_details: functionData || null,
      function_check_error: functionError ? functionError.message : null
    };

    // Try to check authentication (this will help detect JWT issues)
    const authClient = createClient(
      nextEnv.supabaseUrl,
      nextEnv.supabaseAnonKey
    );
    
    const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
    
    result = {
      ...result,
      session: sessionData || null,
      session_error: sessionError ? sessionError.message : null
    };

    // Try running a simple SQL query
    const { data: testData, error: testError } = await supabase.query(`
      SELECT current_database() as database, 
             current_user as user, 
             current_setting('request.jwt.claims', true) as jwt_claims;
    `);
    
    result = {
      ...result,
      test_query: testData || null,
      test_query_error: testError ? testError.message : null
    };

    // Try to directly execute a function if it exists
    if (result.function_exists) {
      try {
        // Test the exec_sql function directly
        const { data: execSqlData, error: execSqlError } = await supabase.rpc('exec_sql', {
          query: 'SELECT 1 as test_value'
        });
        
        result = {
          ...result,
          exec_sql_test: execSqlData || null,
          exec_sql_test_error: execSqlError ? execSqlError.message : null
        };
      } catch (execError) {
        result = {
          ...result,
          exec_sql_test: null,
          exec_sql_test_error: execError instanceof Error ? execError.message : 'Unknown error during exec_sql test'
        };
      }
    }

    // Check if the helper table exists
    const { data: helperTableData, error: helperTableError } = await supabase.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_exec_sql'
      ) as exists;
    `);
    
    result = {
      ...result,
      helper_table_exists: helperTableData && helperTableData.length > 0 ? helperTableData[0].exists : false,
      helper_table_error: helperTableError ? helperTableError.message : null
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database_status: result
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    return NextResponse.json({
      success: false,
      message: 'Error troubleshooting database',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 