import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

// We'll add a list of routes that are protected/auth routes
const protectedRoutes = [
  '/dashboard',
  '/sop',
  '/settings',
];

// And a list of routes that should only be accessible to non-authenticated users
const authRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
];

/**
 * Supabase auth middleware for Next.js App Router
 * Based on official Next.js + Supabase documentation
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

  // Get the session from the request
  const { data: { session } } = await supabase.auth.getSession();
  
  // Get the URL and pathname from the request
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if the route is protected and the session doesn't exist
  if (protectedRoutes.some(route => path.startsWith(route)) && !session) {
    // Redirect to login page
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return { response: NextResponse.redirect(redirectUrl), session: null };
  }

  // Check if the route is an auth route and the session exists
  if (authRoutes.includes(path) && session) {
    // Redirect to dashboard
    return { 
      response: NextResponse.redirect(new URL('/dashboard', request.url)), 
      session 
    };
  }

  return { response, session };
} 