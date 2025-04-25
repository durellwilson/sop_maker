import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverLogger as logger } from '@/lib/logger/server-logger';

const FIREBASE_TOKEN_COOKIE = 'fb-token'; // Firebase token cookie name
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds (adjust as needed)

/**
 * API route to securely set or clear authentication token cookies.
 * This can handle both Firebase and Supabase tokens.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type = 'firebase' } = body; // Default to firebase if type not specified

    const cookieStore = cookies();
    
    // Determine which cookie to set based on the type
    const cookieName = type === 'supabase' ? 'sb-token' : FIREBASE_TOKEN_COOKIE;

    if (token) {
      // Set the HttpOnly cookie
      logger.info(`Setting ${type} auth cookie via API`);
      await cookieStore.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: MAX_AGE, // Set cookie expiry
        path: '/',
        sameSite: 'lax',
      });
      return NextResponse.json({ success: true, message: `${type} auth cookie set` });
    } else {
      // Clear the cookie
      logger.info(`Clearing ${type} auth cookie via API`);
      await cookieStore.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0, // Expire immediately
        path: '/',
        sameSite: 'lax',
      });
      return NextResponse.json({ success: true, message: `${type} auth cookie cleared` });
    }
  } catch (error) {
    logger.error('Error in set-cookie API route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process cookie operation' },
      { status: 500 }
    );
  }
} 