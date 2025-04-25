import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Type for API handler functions with authentication
 */
export type AuthenticatedApiHandler = (
  req: NextRequest, 
  userId: string,
  userRole?: string
) => Promise<NextResponse>;

/**
 * Type for API handler functions that need admin access
 */
export type AdminApiHandler = (
  req: NextRequest, 
  userId: string
) => Promise<NextResponse>;

/**
 * Middleware to protect API routes with authentication
 * @param handler The API handler function
 * @returns A function that first checks authentication
 */
export function withAuth(handler: AuthenticatedApiHandler) {
  return async function(req: NextRequest): Promise<NextResponse> {
    try {
      // Get the Supabase auth client
      const supabase = createRouteHandlerClient({ cookies });
      
      // Verify the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('API Auth Error:', error || 'No session found');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Get user role (if needed for authorization beyond just authentication)
      let userRole: string | undefined;
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
          
        userRole = userData?.role;
      } catch (e) {
        // If we can't get the role, proceed with just authentication
        console.warn('Could not retrieve user role:', e);
      }
      
      // Call the handler with user ID
      return handler(req, session.user.id, userRole);
    } catch (error) {
      console.error('API Auth Exception:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware to protect API routes with admin-only access
 * @param handler The API handler function
 * @returns A function that first checks admin authentication
 */
export function withAdminAuth(handler: AdminApiHandler) {
  return async function(req: NextRequest): Promise<NextResponse> {
    try {
      // Get the Supabase auth client
      const supabase = createRouteHandlerClient({ cookies });
      
      // Verify the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Check if user has admin role
      const isAdmin = session.user.app_metadata?.role === 'admin' ||
                     session.user.user_metadata?.role === 'admin';
      
      // If not already confirmed as admin by metadata, check the database
      if (!isAdmin) {
        try {
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
            
          if (userData?.role !== 'admin') {
            return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
          }
        } catch (e) {
          console.error('Error checking admin role:', e);
          return NextResponse.json(
            { error: 'Admin access check failed' },
            { status: 403 }
          );
        }
      }
      
      // Call the handler with user ID
      return handler(req, session.user.id);
    } catch (error) {
      console.error('Admin API Auth Exception:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
} 