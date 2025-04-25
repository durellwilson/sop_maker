import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserRole } from '@/utils/auth-server';

/**
 * API route to check authentication status
 * This is called from client components to determine if the user is logged in
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from Supabase
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        provider: null,
        user: null
      });
    }
    
    // Get user role
    const role = getUserRole(session.user);
    
    // Return authenticated user data
    return NextResponse.json({
      authenticated: true,
      provider: 'supabase',
      user: {
        id: session.user.id,
        email: session.user.email,
        role: role,
        name: session.user.user_metadata?.full_name || 
              session.user.user_metadata?.name || 
              session.user.email?.split('@')[0] || 
              'User'
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        authenticated: false,
        provider: null,
        user: null
      },
      { status: 500 }
    );
  }
} 