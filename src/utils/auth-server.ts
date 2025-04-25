/**
 * Server-side authentication utilities
 * 
 * This file centralizes all server-side auth-related functionality
 * and should be used in server components, API routes, and middleware
 */

// Re-export server utilities from Supabase
export { 
  createServerSupabaseClient,
  createAdminServerClient,
  getAuthenticatedUser,
  isAuthenticated,
  hasRole,
  getSession
} from '@/utils/supabase/server';

// Re-export auth routes and types from the client-side auth utility
// These are safe to use on the server since they don't contain client-side code
export {
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  AUTH_PROVIDERS,
  AUTH_STATUS,
  getUserRole,
  type UserRole,
  type AuthProvider,
  type AuthStatus
} from '@/utils/auth';

/**
 * Formats an auth error response for API routes
 */
export function formatAuthError(error: unknown, status = 401): Response {
  const message = error instanceof Error 
    ? error.message 
    : 'Authentication error';
  
  return Response.json(
    { error: message },
    { status }
  );
}

/**
 * Standardized function to protect API routes
 */
export async function requireAuth(request: Request): Promise<{ user: any } | Response> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return formatAuthError('Unauthorized - Authentication required');
    }
    
    return { user };
  } catch (error) {
    console.error('Auth error:', error);
    return formatAuthError(error);
  }
}

/**
 * Checks if a path matches any patterns in an array
 */
export function pathMatches(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Handle exact matches
    if (pattern === path) return true;
    
    // Handle wildcard patterns (e.g., /api/admin/*)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }
    
    return false;
  });
} 