import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, executeSql, createUserWithStringId, attemptDirectSqlFix } from '@/utils/server/supabase-server';

/**
 * POST /api/fix-users - Fix user management and database issues
 * Creates the users table with TEXT ids and proper fields
 */
export async function POST(req: NextRequest) {
  console.log('Fix users endpoint called');
  
  try {
    // Get Supabase client - will throw if not available
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }
    
    // First, try to ensure functions exist
    console.log('Attempting to ensure SQL functions exist...');
    const sqlFixResult = await attemptDirectSqlFix();
    console.log('SQL function creation result:', sqlFixResult);
    
    // Attempt to create both tables with the needed schema
    const results = [];
    
    // Try to create users table
    console.log('Creating users table with proper schema...');
    const userTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('User table creation result:', userTableResult);
    results.push({ action: 'create_users_table', status: userTableResult.success ? 'success' : 'failed' });
    
    // Try to create SOPs table
    console.log('Creating SOPs table with proper schema...');
    const sopsTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS sops (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_by TEXT NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    
    console.log('SOPs table creation result:', sopsTableResult);
    results.push({ action: 'create_sops_table', status: sopsTableResult.success ? 'success' : 'failed' });
    
    // Try to create steps table
    console.log('Creating steps table with proper schema...');
    const stepsTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        sop_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        instructions TEXT,
        video_script TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Steps table creation result:', stepsTableResult);
    results.push({ action: 'create_steps_table', status: stepsTableResult.success ? 'success' : 'failed' });
    
    // Try to create media table
    console.log('Creating media table with proper schema...');
    const mediaTableResult = await executeSql(supabase, `
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        step_id TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        size_bytes INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Media table creation result:', mediaTableResult);
    results.push({ action: 'create_media_table', status: mediaTableResult.success ? 'success' : 'failed' });
    
    // Create a system user record to verify the table works
    console.log('Creating system user to verify table access...');
    const systemUserData = {
      id: 'system_admin',
      email: 'system@example.com',
      name: 'System Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const createUserResult = await createUserWithStringId(supabase, systemUserData);
    
    if (createUserResult.success) {
      console.log('System user created or verified successfully');
      results.push({ action: 'create_system_user', status: 'success' });
    } else {
      console.error('Failed to create system user:', createUserResult.error);
      results.push({ action: 'create_system_user', status: 'failed' });
    }
    
    // Run diagnostics to check table access
    const diagnosticResults = [];
    
    // Check users table
    try {
      const { data: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (usersError) {
        console.error('Users table access error:', usersError);
        diagnosticResults.push({ table: 'users', status: 'error', error: usersError.message });
      } else {
        console.log('Users table accessible');
        diagnosticResults.push({ table: 'users', status: 'success' });
      }
    } catch (e) {
      console.error('Users diagnostic error:', e);
      diagnosticResults.push({ table: 'users', status: 'error', error: String(e) });
    }
    
    // Check SOPs table
    try {
      const { data: sopsCount, error: sopsError } = await supabase
        .from('sops')
        .select('*', { count: 'exact', head: true });
        
      if (sopsError) {
        console.error('SOPs table access error:', sopsError);
        diagnosticResults.push({ table: 'sops', status: 'error', error: sopsError.message });
      } else {
        console.log('SOPs table accessible');
        diagnosticResults.push({ table: 'sops', status: 'success' });
      }
    } catch (e) {
      console.error('SOPs diagnostic error:', e);
      diagnosticResults.push({ table: 'sops', status: 'error', error: String(e) });
    }
    
    // Try to migrate user if token provided
    console.log('Checking for current user token...');
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (idToken) {
      try {
        // Call auth/sync directly to register this user
        const syncResponse = await fetch(`${req.nextUrl.origin}/api/auth/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('User sync successful:', syncResult);
          results.push({ action: 'sync_current_user', status: 'success', user: syncResult.user });
        } else {
          console.error('User sync failed:', await syncResponse.text());
          results.push({ action: 'sync_current_user', status: 'failed' });
        }
      } catch (syncError) {
        console.error('Error during user sync:', syncError);
        results.push({ action: 'sync_current_user', status: 'error', message: String(syncError) });
      }
    } else {
      console.log('No user token provided, skipping user sync');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database initialization completed',
      results: results,
      diagnostics: diagnosticResults
    });
  } catch (error) {
    // Log error but don't crash the app
    console.error('Error in POST /api/fix-users:', error);
    
    // Return 200 with warning to prevent client from failing completely
    return NextResponse.json({
      warning: 'Database initialization had errors but app can continue',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 200 });
  }
} 