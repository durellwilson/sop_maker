import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authAdmin } from '@/utils/firebase-admin';

/**
 * GET /api/auth/token - Get the current user's Firebase token from the session cookie
 */
export async function GET(req: NextRequest) {
  try {
    // Get the Firebase session cookie from the request
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    
    if (!sessionCookie) {
      console.error('No session cookie found');
      return NextResponse.json({ error: 'No authenticated session' }, { status: 401 });
    }
    
    try {
      // Verify the session cookie and get the decoded claims
      const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie, true);
      
      // Return the user ID and create a custom token for client-side API calls
      const customToken = await authAdmin.createCustomToken(decodedClaims.uid);
      
      return NextResponse.json({
        token: customToken,
        userId: decodedClaims.uid
      });
    } catch (verifyError) {
      console.error('Error verifying session:', verifyError);
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in token API:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 