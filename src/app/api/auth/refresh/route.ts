import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

/**
 * API endpoint to refresh authentication tokens
 * This is used when tokens expire and need to be refreshed
 */
export async function POST(request: NextRequest) {
  try {
    // Create server-side Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get the current session
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }
    
    // Refresh the token
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('Error refreshing token:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to refresh token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    });
  } catch (error) {
    console.error('Unexpected error in token refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error during token refresh' },
      { status: 500 }
    );
  }
} 