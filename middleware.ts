import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/sop',
  '/admin',
  '/profile',
  '/sops', // Add the sops route to protected routes
];

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/signin',
  '/auth/signup',
  '/auth/callback',
  '/auth/handle-callback',
  '/auth/reset-password',
  '/auth/verify-email',
  '/diagnostics/auth', // Allow access to the auth diagnostics page
  '/auth-test', // Add test page for authentication testing
];

/**
 * Middleware for route protection and authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip checking for public routes and static resources
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }
  
  // Check if the route requires authentication
  const requiresAuth = PROTECTED_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(`${route}/`)
  );
  
  if (requiresAuth) {
    try {
      // Create a Supabase client for the middleware
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => {
              return request.cookies.get(name)?.value;
            },
            set: (name, value, options) => {
              request.cookies.set({
                name,
                value,
                ...options,
              });
            },
            remove: (name, options) => {
              request.cookies.set({
                name,
                value: '',
                ...options,
              });
            },
          },
        }
      );
      
      // Get the session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error in middleware:', error);
      }
      
      // If no auth found, redirect to login
      if (!session) {
        // Create the redirect URL with the original path as a redirect parameter
        const redirectUrl = new URL('/auth/signin', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        
        return NextResponse.redirect(redirectUrl);
      }
      
      // User is authenticated, add headers for server components
      const response = NextResponse.next();
      
      // Set auth status header
      response.headers.set('x-auth-status', 'authenticated');
      
      // Set user ID header if available from Supabase
      if (session?.user?.id) {
        response.headers.set('x-user-id', session.user.id);
      }
      
      return response;
    } catch (error) {
      console.error('Auth middleware error:', error);
      // On error, redirect to sign-in for safety
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      redirectUrl.searchParams.set('error', 'auth_error');
      
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  return NextResponse.next();
}

// Match all routes except for API routes, static files, etc.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public image files)
     * - public/ (public assets)
     * - Exclude api/auth routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|public|api/auth).*)',
  ],
}; 