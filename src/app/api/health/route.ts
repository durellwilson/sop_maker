import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health - Simple health check endpoint
 * Used to determine if the server is online
 */
export async function GET(req: NextRequest) {
  try {
    // Add cache control headers to prevent caching
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }, { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
} 