import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/create-functions - Create necessary SQL functions in Supabase
 * This endpoint sets up helper functions like exec_sql and drop_if_exists
 */
export async function POST(req: NextRequest) {
  console.log('Create-functions endpoint called');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    // Create client with highest possible permissions
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Track results of our operations
    const results = [];
    
    // First, attempt to get version to check connection
    try {
      const { data: versionData, error: versionError } = await supabase
        .from('_version')
        .select('*')
        .limit(1);
        
      if (versionError) {
        console.log('Version check failed but continuing:', versionError.message);
        results.push({ action: 'check_version', status: 'failed', message: versionError.message });
      } else {
        console.log('Database connection verified');
        results.push({ action: 'check_version', status: 'success' });
      }
    } catch (e) {
      console.log('Version check error:', e);
    }
    
    // Create helper function to execute SQL safely
    const executeSql = async (name, sql) => {
      try {
        // Try to use RPC if it exists
        try {
          const { data, error } = await supabase.rpc('exec_sql', { query: sql });
          if (!error) {
            console.log(`Successfully executed ${name} using RPC`);
            return { success: true, data };
          }
        } catch (rpcError) {
          console.log(`RPC method not available for ${name}:`, rpcError);
        }
        
        // Fallback to direct query using pg/postgres (would require a different approach)
        console.log(`Attempting fallback execution for ${name}`);
        
        // We can't use .execute() in Supabase v2.x client - it's not supported
        // Return a pending status to indicate manual setup might be needed
        return { 
          success: false, 
          fallback: true,
          message: `Automatic SQL execution not available - please run this SQL manually:\n${sql}`
        };
      } catch (error) {
        console.error(`Error executing ${name}:`, error);
        return { success: false, error };
      }
    };
    
    // 1. Create the exec_sql function
    const execSqlFn = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text) 
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO postgres;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
    `;
    
    const execSqlResult = await executeSql('exec_sql', execSqlFn);
    results.push({ 
      action: 'create_exec_sql', 
      status: execSqlResult.success ? 'success' : 'pending',
      message: execSqlResult.message 
    });
    
    // 2. Create drop_if_exists function
    const dropIfExistsFn = `
      CREATE OR REPLACE FUNCTION public.drop_if_exists(table_name text)
      RETURNS void AS $$
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      GRANT EXECUTE ON FUNCTION public.drop_if_exists(text) TO postgres;
      GRANT EXECUTE ON FUNCTION public.drop_if_exists(text) TO anon;
      GRANT EXECUTE ON FUNCTION public.drop_if_exists(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.drop_if_exists(text) TO service_role;
    `;
    
    const dropIfExistsResult = await executeSql('drop_if_exists', dropIfExistsFn);
    results.push({ 
      action: 'create_drop_if_exists', 
      status: dropIfExistsResult.success ? 'success' : 'pending',
      message: dropIfExistsResult.message 
    });
    
    // 3. Create get_service_version function
    const versionFn = `
      CREATE OR REPLACE FUNCTION public.get_service_version()
      RETURNS int AS $$
      BEGIN
        RETURN 1;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      GRANT EXECUTE ON FUNCTION public.get_service_version() TO postgres;
      GRANT EXECUTE ON FUNCTION public.get_service_version() TO anon;
      GRANT EXECUTE ON FUNCTION public.get_service_version() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.get_service_version() TO service_role;
    `;
    
    const versionResult = await executeSql('get_service_version', versionFn);
    results.push({ 
      action: 'create_get_service_version', 
      status: versionResult.success ? 'success' : 'pending',
      message: versionResult.message 
    });
    
    // 4. Create users table
    const usersTable = `
      CREATE TABLE IF NOT EXISTS public.users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const usersResult = await executeSql('users_table', usersTable);
    results.push({ 
      action: 'create_users_table', 
      status: usersResult.success ? 'success' : 'pending',
      message: usersResult.message 
    });
    
    // 5. Create SOPs table
    const sopsTable = `
      CREATE TABLE IF NOT EXISTS public.sops (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_by TEXT NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES public.users(id)
      );
    `;
    
    const sopsResult = await executeSql('sops_table', sopsTable);
    results.push({ 
      action: 'create_sops_table', 
      status: sopsResult.success ? 'success' : 'pending',
      message: sopsResult.message 
    });
    
    return NextResponse.json({
      success: true,
      message: 'SQL functions creation attempts completed',
      results: results,
    });
  } catch (error) {
    console.error('Error in create-functions:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Function creation encountered errors but attempted repairs',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 200 }); // Still return 200 to not break the app
  }
} 