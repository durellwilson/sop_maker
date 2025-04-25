import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, execSQL } from '@/utils/server/supabase-server';

/**
 * POST /api/fix-data
 * Special endpoint to fix data issues in development mode
 * Warning: This endpoint bypasses authentication in development mode
 */
export async function POST(req: NextRequest) {
  // Only allow this in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const action = body.action || 'diagnostic';
    
    console.log('Running fix-data with action:', action);
    
    switch (action) {
      case 'diagnostic':
        return await runDiagnostic();
      case 'create_sample_sops':
        return await createSampleSOPs();
      case 'fix_tables':
        return await fixTables();
      case 'reset_database':
        return await resetDatabase();
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in fix-data endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Run diagnostic checks on the database
async function runDiagnostic() {
  const diagnostics = [];
  const errors = [];
  
  try {
    // Test if tables exist
    for (const table of ['users', 'sops', 'steps', 'media']) {
      try {
        const query = `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        )`;
        
        const result = await execSQL(query);
        const exists = result[0]?.exists || false;
        
        diagnostics.push({
          check: `table_exists_${table}`,
          result: exists,
          status: exists ? 'pass' : 'fail'
        });
        
        if (!exists) {
          errors.push(`Table '${table}' does not exist`);
        }
      } catch (error) {
        diagnostics.push({
          check: `table_exists_${table}`,
          result: false,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Count records in each table
    for (const table of ['users', 'sops']) {
      try {
        const query = `SELECT COUNT(*) FROM ${table}`;
        const result = await execSQL(query);
        const count = parseInt(result[0]?.count || '0');
        
        diagnostics.push({
          check: `count_${table}`,
          result: count,
          status: 'pass'
        });
      } catch (error) {
        diagnostics.push({
          check: `count_${table}`,
          result: 0,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      diagnostics,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      diagnostics
    }, { status: 500 });
  }
}

// Create sample SOPs for testing
async function createSampleSOPs() {
  try {
    // Create a sample user if none exists
    let userId;
    try {
      // First try to get any existing user
      try {
        const checkUserQuery = 'SELECT id FROM users LIMIT 1';
        const userResult = await execSQL(checkUserQuery);
        
        if (userResult && userResult.length > 0) {
          userId = userResult[0].id;
          console.log('Using existing user:', userId);
        }
      } catch (checkError) {
        console.log('Error checking for existing users:', checkError);
      }
      
      // If no user found, create one
      if (!userId) {
        const devUserId = 'dev-user';
        
        const createUserQuery = `
          INSERT INTO users (id, email, name, created_at, updated_at)
          VALUES ($1, 'dev@example.com', 'Development User', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE 
          SET updated_at = NOW()
          RETURNING id
        `;
        
        const newUserResult = await execSQL(createUserQuery, [devUserId]);
        if (newUserResult && newUserResult.length > 0) {
          userId = newUserResult[0].id;
          console.log('Created new user:', userId);
        } else {
          // Fallback to hardcoded ID if query worked but didn't return a result
          userId = devUserId;
          console.log('Using fallback user ID:', userId);
        }
      }
    } catch (userError) {
      console.error('Error getting/creating user:', userError);
      // Fallback to hardcoded ID
      userId = 'dev-user-fallback';
      console.log('Using hardcoded fallback user ID after error:', userId);
    }
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get/create user'
      }, { status: 500 });
    }
    
    // Create some sample SOPs
    const sops = [];
    const titles = [
      'How to Process Customer Returns',
      'Employee Onboarding Procedure',
      'Monthly Financial Reconciliation',
      'Quality Assurance Protocol',
      'Emergency Response Plan'
    ];
    
    for (const title of titles) {
      try {
        const createSopQuery = `
          INSERT INTO sops (
            title, 
            description, 
            category, 
            version, 
            status, 
            created_by, 
            created_at, 
            updated_at
          )
          VALUES (
            $1, 
            'This is a sample SOP created for testing', 
            'Sample', 
            '1.0', 
            'draft', 
            $2, 
            NOW(), 
            NOW()
          )
          RETURNING *
        `;
        
        const result = await execSQL(createSopQuery, [title, userId]);
        if (result && result.length > 0) {
          sops.push(result[0]);
        }
      } catch (sopError) {
        console.error(`Error creating SOP "${title}":`, sopError);
      }
    }
    
    return NextResponse.json({
      success: true,
      user_id: userId,
      sops_created: sops.length,
      sops
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Fix tables in the database
async function fixTables() {
  const results = [];
  
  try {
    // Fix users table
    try {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      
      await execSQL(createUsersTable);
      results.push({ table: 'users', status: 'success' });
    } catch (usersError) {
      results.push({ 
        table: 'users', 
        status: 'error', 
        error: usersError instanceof Error ? usersError.message : String(usersError) 
      });
    }
    
    // Fix sops table
    try {
      const createSopsTable = `
        CREATE TABLE IF NOT EXISTS sops (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          created_by TEXT NOT NULL,
          is_published BOOLEAN DEFAULT FALSE,
          version TEXT DEFAULT '1.0',
          status TEXT DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      
      await execSQL(createSopsTable);
      results.push({ table: 'sops', status: 'success' });
    } catch (sopsError) {
      results.push({ 
        table: 'sops', 
        status: 'error', 
        error: sopsError instanceof Error ? sopsError.message : String(sopsError) 
      });
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      results
    }, { status: 500 });
  }
}

// Reset the database
async function resetDatabase() {
  try {
    // Drop all tables
    const tables = ['steps', 'media', 'sops', 'users'];
    const results = [];
    
    for (const table of tables) {
      try {
        await execSQL(`DROP TABLE IF EXISTS ${table} CASCADE`);
        results.push({ table, action: 'drop', status: 'success' });
      } catch (dropError) {
        results.push({ 
          table, 
          action: 'drop', 
          status: 'error', 
          error: dropError instanceof Error ? dropError.message : String(dropError) 
        });
      }
    }
    
    // Recreate tables
    const fixResult = await fixTables();
    
    return NextResponse.json({
      success: true,
      drop_results: results,
      create_results: fixResult
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 