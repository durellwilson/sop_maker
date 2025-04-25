import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/callback',
  '/auth/handle-callback',
  '/auth/reset-password',
  '/auth/verification',
  '/auth/verify-email',
  '/auth-test',
  '/help',
  '/privacy',
  '/terms',
  '/api/public'
];

// Define admin-only routes
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin'
];

// Static file patterns
const STATIC_FILE_PATTERNS = [
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json'
];

/**
 * Checks if a route is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(pattern => pattern.test(pathname));
}

/**
 * Checks if a route is an admin route (requires admin privileges)
 */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(pattern => pattern.test(pathname));
}

/**
 * Checks if a route is a static file (should skip middleware)
 */
function isStaticFile(pathname: string): boolean {
  return STATIC_FILE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Middleware to handle authentication and authorization for all routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files
  if (STATIC_FILE_PATTERNS.some(pattern => pathname.includes(pattern))) {
    return NextResponse.next();
  }
  
  // Allow public routes without authentication
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }
  
  // Create a response to modify
  let response = NextResponse.next();
  
  // Initialize Supabase client using cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  try {
    // Check if the user is signed in
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (!session) {
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // User is not authenticated, redirect to sign in
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Check for admin-only routes
    if (ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      // Check if user has admin role
      const isAdmin = user?.app_metadata?.role === 'admin';
      
      if (!isAdmin) {
        // For API routes, return 403 instead of redirecting
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
        
        // User is not an admin, redirect to unauthorized page
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
    
    // User is authenticated and authorized, proceed
    return response;
  } catch (error) {
    console.error('Authentication error in middleware:', error);
    
    // For API routes, return 500 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }
    
    // Redirect to sign in on auth error
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    redirectUrl.searchParams.set('error', 'session_error');
    return NextResponse.redirect(redirectUrl);
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 