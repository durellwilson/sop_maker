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

  // Initialize Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // First test: Try to execute a simple SQL query using exec_sql function
    const { data: execData, error: execError } = await supabase
      .rpc('exec_sql', { query: 'SELECT NOW() as current_time, version() as postgres_version' })
      .catch(e => ({ data: null, error: e }));

    if (execError) {
      // If the function call fails, check if the function exists
      const { data: functionExists, error: functionError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'exec_sql')
        .maybeSingle()
        .catch(e => ({ data: null, error: e }));

      // Check if the helper table exists
      const { data: tableExists, error: tableError } = await supabase
        .from('_exec_sql')
        .select('id')
        .limit(1)
        .catch(e => ({ data: null, error: e }));

      return NextResponse.json({
        success: false,
        message: 'exec_sql function test failed',
        error: execError,
        functionExists: !functionError && functionExists !== null,
        tableExists: !tableError && tableExists !== null,
        diagnostics: {
          functionError,
          tableError
        }
      }, { status: 500 });
    }

    // Second test: Get the recent records from the _exec_sql table
    const { data: logData, error: logError } = await supabase
      .from('_exec_sql')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .catch(e => ({ data: null, error: e }));

    return NextResponse.json({
      success: true,
      message: 'exec_sql function is working correctly',
      results: {
        functionTest: execData,
        recentLogs: logError ? { error: logError.message } : logData
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test exec_sql function',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 