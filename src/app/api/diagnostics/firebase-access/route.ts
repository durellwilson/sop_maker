import { NextResponse } from 'next/server';
import { getFirebaseAccessLog, clearFirebaseAccessLog } from '@/utils/env-checker';

/**
 * GET handler to check if any Firebase environment variables are being accessed
 */
export async function GET() {
  const accessLog = getFirebaseAccessLog();
  
  return NextResponse.json({
    message: 'Firebase environment variable access log',
    accessLog,
    hasAccesses: Object.keys(accessLog).length > 0,
    timestamp: new Date().toISOString()
  });
}

/**
 * POST handler to clear the Firebase access log
 */
export async function POST() {
  clearFirebaseAccessLog();
  
  return NextResponse.json({
    message: 'Firebase access log cleared',
    timestamp: new Date().toISOString()
  });
} 