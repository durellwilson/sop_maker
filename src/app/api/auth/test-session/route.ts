import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/utils/supabase/server';

/**
 * Test API endpoint to verify server-side authentication
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Create a server-side Supabase client
    const supabase = createServerSupabaseClient();
    const clientInitTime = Date.now();
    
    // Get the session using the client
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const sessionTime = Date.now();
    
    // Try getting the authenticated user directly
    const user = await getAuthenticatedUser();
    const userTime = Date.now();
    
    // Return detailed information about authentication status
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: !!user,
      timings: {
        clientInit: clientInitTime - startTime,
        getSession: sessionTime - clientInitTime,
        getUser: userTime - sessionTime,
        total: userTime - startTime
      },
      session: {
        exists: !!sessionData?.session,
        error: sessionError ? sessionError.message : null
      },
      user: user ? {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        hasMetadata: !!user.user_metadata,
      } : null,
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Error in test-session API:', error);
    
    return NextResponse.json({
      error: 'Failed to check authentication',
      message: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 