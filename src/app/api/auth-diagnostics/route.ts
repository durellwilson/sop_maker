import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/utils/api-error-handler';
import { authTroubleshooter } from '@/lib/auth-troubleshooter';
import { serverLogger as logger } from '@/lib/logger/server-logger';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to diagnose and fix Firebase-Supabase auth integration issues
 * @route POST /api/auth-diagnostics
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  logger.auth('Auth diagnostics API called', undefined, { url: request.url });
  
  try {
    const body = await request.json();
    const { email, action } = body;
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required for auth diagnostics'
      }, { status: 400 });
    }
    
    if (action === 'fix') {
      // Run fixes for auth integration issues
      const { fixes, errors } = await authTroubleshooter.fixAuthIntegrationIssues();
      
      return NextResponse.json({
        success: errors.length === 0,
        timestamp: new Date().toISOString(),
        fixes,
        errors
      });
    } else {
      // Run tests for auth integration
      const results = await authTroubleshooter.testAuthFlow(email, 'placeholder-password');
      
      // Calculate overall status
      const hasErrors = results.some(result => !result.success);
      
      return NextResponse.json({
        success: !hasErrors,
        timestamp: new Date().toISOString(),
        results
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.auth('Error in auth diagnostics API', err);
    
    return NextResponse.json({
      success: false,
      message: `Error in auth diagnostics: ${err.message}`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});

/**
 * API endpoint to get auth diagnostics
 * @route GET /api/auth-diagnostics
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  logger.auth('Auth diagnostics status API called', undefined, { url: request.url });
  
  try {
    // Test JWT handling functions
    const jwtHandlingResult = await authTroubleshooter.testJwtHandlingFunctions();
    
    // Check if tables are properly set up
    const tableChecks = await checkAuthTables();
    
    // Build response
    const issues = [];
    const recommendations = [];
    
    if (!jwtHandlingResult.success) {
      issues.push('JWT handling functions are missing or misconfigured');
      recommendations.push('Run the fix operation to create proper JWT handling functions');
    }
    
    tableChecks.issues.forEach(issue => issues.push(issue));
    tableChecks.recommendations.forEach(rec => recommendations.push(rec));
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: issues.length === 0 ? 'healthy' : 'error',
      issues,
      recommendations,
      jwtHandling: jwtHandlingResult,
      tableSetup: tableChecks
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.auth('Error in auth diagnostics GET API', err);
    
    return NextResponse.json({
      success: false,
      message: `Error in auth diagnostics: ${err.message}`,
      timestamp: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
});

/**
 * Checks auth-related database tables
 */
async function checkAuthTables() {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if users table exists
  const usersExists = await dbTroubleshooter.tableExists('users');
  if (!usersExists) {
    issues.push('Users table does not exist');
    recommendations.push('Run the fix operation to create the users table');
  }
  
  // Check if Firebase user mapping table exists
  const mappingExists = await dbTroubleshooter.tableExists('firebase_user_mapping');
  if (!mappingExists) {
    issues.push('Firebase user mapping table does not exist');
    recommendations.push('Run the fix operation to create the Firebase user mapping table');
  }
  
  // Check if RLS is enabled on users table
  if (usersExists) {
    const usersRlsEnabled = await dbTroubleshooter.rlsEnabled('users');
    if (!usersRlsEnabled) {
      issues.push('Row Level Security is not enabled on the users table');
      recommendations.push('Run the fix operation to enable RLS on the users table');
    }
    
    // Check policies on users table
    const usersPolicies = await dbTroubleshooter.listPolicies('users');
    if (usersPolicies.length === 0) {
      issues.push('No RLS policies defined for the users table');
      recommendations.push('Run the fix operation to create proper RLS policies for users');
    }
  }
  
  return { issues, recommendations };
}

// Import dbTroubleshooter at the top of the file
import { dbTroubleshooter } from '@/utils/db-troubleshooter'; 