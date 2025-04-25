import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/sop',
  '/settings',
  '/profile',
];

// And a list of routes that should only be accessible to non-authenticated users
const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/signup',
  '/login',
  '/forgot-password',
];

// Define public routes that should always be accessible
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/auth',
  '/auth/callback',
  '/auth/handle-callback',
  '/error',
  '/unauthorized',
];

/**
 * Creates a Supabase client for use in middleware
 * This client is specifically configured for Next.js middleware
 * and handles cookie management
 * 
 * @param request The Next.js request object
 * @returns A Supabase client configured for middleware use
 */
export function createClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in middleware');
    throw new Error('Missing Supabase credentials');
  }
  
  // Create response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Return the client with cookie management
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });
}

/**
 * Supabase auth middleware for Next.js App Router
 * Handles session management and route protection
 * This function is used in the main middleware.ts file
 * 
 * Uses getUser() instead of getSession() to protect against session fixation attacks
 * as recommended in the Supabase security best practices
 */
export async function updateSession(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in middleware');
    return { response: NextResponse.next(), session: null };
  }

  // Create a cookies instance
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client using the middleware API
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // If the cookie is updated, update the cookies for the request and response
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        // If the cookie is removed, update the cookies for the request and response
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Use getUser() instead of getSession() for more secure authentication
  // This helps prevent session fixation attacks
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get the session only if we have a valid user
  // This two-step verification provides additional security
  let session = null;
  if (user) {
    const { data: { session: userSession } } = await supabase.auth.getSession();
    session = userSession;
  }
  
  // Add authentication info to headers for route handlers
  if (user && session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-email', user.email || '');
    requestHeaders.set('x-user-role', user.app_metadata?.role || 'viewer');
    requestHeaders.set('x-auth-provider', 'supabase');
    requestHeaders.set('x-auth-status', 'authenticated');
    
    // Update the response with the new headers
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // For backward compatibility with old middleware.ts that uses this function
  // Check if the route requires authentication
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Always allow auth callback and handle-callback pages
  if (path.startsWith('/auth/callback') || path.startsWith('/auth/handle-callback')) {
    return { response, session };
  }
  
  // Allow public routes to pass through
  if (publicRoutes.some(route => path === route || path.startsWith(route + '/'))) {
    return { response, session };
  }
  
  // Allow auth routes to pass through
  if (authRoutes.some(route => path === route || path.startsWith(route + '/'))) {
    return { response, session };
  }
  
  // Check if the route is protected and the session doesn't exist
  if (protectedRoutes.some(route => path.startsWith(route)) && !session) {
    // Redirect to signin page
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return { response: NextResponse.redirect(redirectUrl), session: null };
  }
  
  return { response, session };
} 