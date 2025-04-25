import { NextRequest, NextResponse } from 'next/server';
import { serverLogger as logger } from '@/lib/logger/server-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the origin for constructing API URLs
    const origin = request.nextUrl.origin;
    
    // Step 1: First, ensure the exec_sql function is created
    logger.info('Initializing database: Setting up exec_sql function...');
    const dbSetupResponse = await fetch(`${origin}/api/db-setup`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    const dbSetupResult = await dbSetupResponse.json();
    if (!dbSetupResult.success) {
      logger.error('Failed to set up exec_sql function:', dbSetupResult.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize exec_sql function',
        error: dbSetupResult.error,
        step: 'exec_sql_setup'
      }, { status: 500 });
    }
    
    // Step 2: Initialize the database tables
    logger.info('Setting up database tables...');
    const initResponse = await fetch(`${origin}/api/init-database`, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    const initResult = await initResponse.json();
    
    // Check if any tables failed to initialize
    const failures = initResult.results?.filter(r => r.status === 'failed') || [];
    
    // Return the combined results
    return NextResponse.json({
      success: true,
      message: 'Database initialization process completed',
      exec_sql_setup: dbSetupResult,
      table_initialization: initResult,
      failures: failures.length > 0 ? failures : null,
      tables_with_issues: failures.length > 0 
        ? failures.map(f => f.action.replace('create_', '').replace('_table', ''))
        : []
    });
    
  } catch (error) {
    logger.error('Database full initialization error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error during database initialization process',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 