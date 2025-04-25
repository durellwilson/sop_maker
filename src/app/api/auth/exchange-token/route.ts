import { NextRequest, NextResponse } from 'next/server';
import { exchangeFirebaseTokenForSupabaseSession, setSupabaseCookies } from '@/utils/auth/token-exchange';

/**
 * API endpoint to exchange Firebase ID tokens for Supabase sessions
 * This allows a seamless integration between Firebase Auth and Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    // Extract the Firebase token from the request
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    // Exchange the Firebase token for a Supabase session
    const sessionData = await exchangeFirebaseTokenForSupabaseSession(token, {
      createSupabaseAccountIfMissing: true,
      syncUserData: true,
    });

    // Create a response with the session data
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Set the Supabase cookies
    return setSupabaseCookies(response, sessionData);
    
  } catch (error) {
    console.error('Token exchange error:', error);
    
    // Determine the appropriate status code
    let status = 500;
    let message = 'Internal server error';
    let details = null;
    
    if (error instanceof Error) {
      // More specific error handling
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('firebase id token') || 
          errorMessage.includes('invalid token') ||
          errorMessage.includes('expired')) {
        status = 401;
        message = 'Invalid or expired token';
      } else if (errorMessage.includes('does not exist') ||
                errorMessage.includes('not found')) {
        status = 404;
        message = 'User not found';
      } else if (errorMessage.includes('not enabled') ||
                errorMessage.includes('disabled')) {
        status = 403;
        message = 'Account disabled';
      } else if (errorMessage.includes('service role key') ||
                errorMessage.includes('user not allowed')) {
        status = 500;
        message = 'Configuration error: Supabase permissions issue';
        // In development, provide more details
        if (process.env.NODE_ENV === 'development') {
          details = 'The Supabase service role key may be missing or have incorrect permissions. Check environment variables and Supabase project settings.';
        }
      } else if (errorMessage.includes('missing supabase')) {
        status = 500;
        message = 'Configuration error: Missing Supabase credentials';
        if (process.env.NODE_ENV === 'development') {
          details = 'Check your .env file for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';
        }
      }
    }
    
    // If we're in development, provide the full error details
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: message, 
          details: details || (error instanceof Error ? error.message : 'Unknown error'),
          stack: error instanceof Error && error.stack ? error.stack : undefined
        },
        { status }
      );
    }
    
    // In production, only return limited error info
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

/**
 * Route to check if the token exchange feature is available
 */
export async function GET() {
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  return NextResponse.json(
    { 
      available: true,
      configured: isConfigured,
      providers: ['firebase', 'supabase'] 
    },
    { status: 200 }
  );
} 