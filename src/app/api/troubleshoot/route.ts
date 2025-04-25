import { NextRequest, NextResponse } from 'next/server';
import { dbTroubleshooter } from '@/utils/db-troubleshooter';
import { authTroubleshooter } from '@/utils/auth-troubleshooter';
import { isAdmin } from '@/lib/auth';
import { serverLogger as logger } from '@/lib/logger/server-logger';

export async function POST(request: NextRequest) {
  try {
    // Admin-only endpoint
    const adminCheck = await isAdmin();
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { action, email, password } = data;

    switch (action) {
      case 'diagnose_db':
        // Check database issues
        const dbIssues = await dbTroubleshooter.checkDatabaseIssues();
        return NextResponse.json({ success: true, issues: dbIssues });

      case 'fix_db':
        // Fix database issues
        const dbFixes = await dbTroubleshooter.fixDatabaseIssues();
        return NextResponse.json({ success: true, results: dbFixes });

      case 'test_auth_flow':
        // Test authentication flow
        if (!email || !password) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Email and password required for auth flow test' },
            { status: 400 }
          );
        }

        const authFlowResult = await authTroubleshooter.testAuthFlow(email, password);
        return NextResponse.json({ success: true, results: authFlowResult });

      case 'test_jwt':
        // Test JWT handling
        const jwtResult = await authTroubleshooter.testJwtHandling();
        return NextResponse.json({ success: true, results: jwtResult });

      case 'diagnose_integration':
        // Diagnose integration issues
        const integrationIssues = await authTroubleshooter.diagnoseIntegrationIssues();
        return NextResponse.json({ success: true, issues: integrationIssues });

      case 'fix_integration':
        // Fix integration issues
        const fixResults = await authTroubleshooter.fixAuthIntegrationIssues();
        return NextResponse.json({ success: true, results: fixResults });

      case 'create_user_mapping':
        // Create user mapping
        if (!email || !data.firebaseUid) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Email and firebaseUid required for creating user mapping' },
            { status: 400 }
          );
        }

        const mappingResult = await authTroubleshooter.createUserMapping(data.firebaseUid, email);
        return NextResponse.json({ success: true, results: mappingResult });

      default:
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Error in troubleshoot API route', err);
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}

// Return allowed methods for OPTIONS requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
} 