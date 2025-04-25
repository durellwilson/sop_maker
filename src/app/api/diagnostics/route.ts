import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/utils/api-error-handler';
import { dbTroubleshooter } from '@/utils/db-troubleshooter';
import { firebaseTroubleshooter } from '@/lib/firebase-troubleshooter';
import { serverLogger as logger } from '@/lib/logger/server-logger';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to get system diagnostics
 * @route GET /api/diagnostics
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  logger.info('Diagnostics API called', { context: 'API', data: { url: request.url } });
  
  try {
    // Run database diagnostics
    const dbResult = await runDatabaseDiagnostics();
    
    // Run Firebase diagnostics
    const firebaseResult = await runFirebaseDiagnostics();
    
    // Get environment info
    const envInfo = getEnvironmentInfo();
    
    const diagnosticResults = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      database: dbResult,
      firebase: firebaseResult,
      status: getOverallStatus(dbResult, firebaseResult)
    };
    
    logger.info('Diagnostics completed successfully', { 
      context: 'API',
      data: { status: diagnosticResults.status }
    });
    
    return NextResponse.json(diagnosticResults);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error in diagnostics');
    logger.error('Error running diagnostics', err, { context: 'API' });
    
    // Even if there's an error, try to return as much information as possible
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: err.message,
      status: 'error',
      partial_results: true
    }, { status: 500 });
  }
});

/**
 * Runs database diagnostics
 */
async function runDatabaseDiagnostics() {
  try {
    // Check connection
    const connectionCheck = await dbTroubleshooter.checkConnection();
    
    // If connection fails, return early
    if (!connectionCheck.isConnected) {
      return {
        connected: false,
        status: 'error',
        error: connectionCheck.error,
        info: null,
        issues: ['Database connection failed'],
        recommendations: ['Check database credentials and connection']
      };
    }
    
    // Get database info
    const dbInfo = await dbTroubleshooter.getDatabaseInfo();
    
    // Run comprehensive diagnostics
    const { issues, fixes, unfixable } = await dbTroubleshooter.diagnoseDatabaseIssues();
    
    // Determine status based on issues
    const status = issues.length === 0 ? 'healthy' : (unfixable.length > 0 ? 'error' : 'warning');
    
    // Combine fixes and unfixable into recommendations
    const recommendations = [
      ...fixes.map(fix => `✅ ${fix}`),
      ...unfixable.map(item => `❌ ${item}`)
    ];
    
    return {
      connected: true,
      status,
      info: dbInfo,
      issues,
      recommendations
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown database error');
    logger.error('Error in database diagnostics', err);
    
    return {
      connected: false,
      status: 'error',
      error: err.message,
      info: null,
      issues: ['Exception occurred during database diagnostics'],
      recommendations: ['Check server logs for details']
    };
  }
}

/**
 * Runs Firebase diagnostics
 */
async function runFirebaseDiagnostics() {
  try {
    // Check Firebase Admin initialization
    const initCheck = await firebaseTroubleshooter.checkAdminInitialization();
    
    // If initialization fails, return early
    if (!initCheck.isInitialized) {
      return {
        initialized: false,
        status: 'error',
        error: initCheck.error,
        issues: ['Firebase Admin initialization failed'],
        recommendations: ['Check Firebase credentials and environment variables']
      };
    }
    
    // Run comprehensive diagnostics
    const { issues, recommendations } = await firebaseTroubleshooter.diagnoseFirebaseIssues();
    
    // Determine status based on issues
    const status = issues.length === 0 ? 'healthy' : 'error';
    
    return {
      initialized: true,
      status,
      issues,
      recommendations
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown Firebase error');
    logger.error('Error in Firebase diagnostics', err);
    
    return {
      initialized: false,
      status: 'error',
      error: err.message,
      issues: ['Exception occurred during Firebase diagnostics'],
      recommendations: ['Check server logs for details']
    };
  }
}

/**
 * Gets environment information
 */
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };
}

/**
 * Determines overall system status based on component statuses
 */
function getOverallStatus(dbResult: any, firebaseResult: any): 'healthy' | 'warning' | 'error' {
  if (dbResult.status === 'error' || firebaseResult.status === 'error') {
    return 'error';
  }
  
  if (dbResult.status === 'warning' || firebaseResult.status === 'warning') {
    return 'warning';
  }
  
  return 'healthy';
} 