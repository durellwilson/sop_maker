import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  // Initialize the Supabase client with the service role key for admin access
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // Check required tables
    const tablesList = [
      'users',
      'sops',
      'steps',
      'media',
      'app_metadata'
    ];
    
    const tablesStatus: Record<string, boolean> = {};
    
    // Check each table existence
    for (const table of tablesList) {
      const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .single();
      
      tablesStatus[table] = !!data;
    }
    
    // Check required functions
    const functionsList = ['exec_sql', 'function_exists'];
    const functionsStatus: Record<string, boolean> = {};
    
    // Check each function existence
    for (const func of functionsList) {
      const { data, error } = await supabaseAdmin
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .eq('routine_name', func)
        .single();
      
      functionsStatus[func] = !!data;
    }
    
    // Get schema version
    let schemaVersion = null;
    const { data: versionData } = await supabaseAdmin
      .from('app_metadata')
      .select('value')
      .eq('key', 'schema_version')
      .single();
    
    if (versionData) {
      schemaVersion = versionData.value;
    }
    
    // Determine overall status
    const areTablesOk = Object.values(tablesStatus).every(status => status);
    const areFunctionsOk = Object.values(functionsStatus).every(status => status);
    const isSchemaVersionOk = !!schemaVersion;
    
    let overall = 'success';
    
    if (!areTablesOk || !areFunctionsOk || !isSchemaVersionOk) {
      overall = 'error';
    }
    
    return NextResponse.json({
      tables: tablesStatus,
      functions: functionsStatus,
      schemaVersion,
      overall
    });
    
  } catch (error) {
    console.error('Error checking database schema:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to check database schema',
        error: String(error) 
      },
      { status: 500 }
    );
  }
} 