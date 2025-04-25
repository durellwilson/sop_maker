import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/utils/supabase/server';

/**
 * Get the current authentication status
 * @route GET /api/auth/status
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from Supabase
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }
    
    // Get the user's roles, if needed
    const supabase = createServerSupabaseClient();
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Return the authentication status with user details
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      role: roleData?.role || 'user',
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    
    return NextResponse.json({
      authenticated: false,
      message: 'Error checking authentication status',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Cors preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 