import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';
import { verifyIsAdmin } from '@/utils/auth/verify-admin';
import { verifyIdToken } from '@/utils/firebase-admin';

/**
 * Middleware that protects admin routes by verifying the user has admin privileges
 * Redirects to login or unauthorized page if verification fails
 * 
 * @param request The Next.js request object
 * @returns NextResponse with appropriate redirects or headers
 */
export async function adminMiddleware(request: NextRequest) {
  try {
    let userId = null;
    let isAuthenticated = false;
    
    // Extract user from Supabase
    const supabase = createClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (user && session) {
      userId = user.id;
      isAuthenticated = true;
    } else {
      // Check for Firebase token if no Supabase session
      const firebaseToken = request.cookies.get('firebase_token')?.value;
      
      if (firebaseToken) {
        try {
          const decodedToken = await verifyIdToken(firebaseToken);
          if (decodedToken) {
            userId = decodedToken.uid;
            
            // Check if Firebase token has admin claim directly
            if (decodedToken.admin === true) {
              // User is admin via Firebase, prepare response with auth headers
              const response = NextResponse.next();
              response.headers.set('x-auth-status', 'authenticated');
              response.headers.set('x-auth-provider', 'firebase');
              response.headers.set('x-firebase-uid', decodedToken.uid);
              response.headers.set('x-firebase-admin', 'true');
              return response;
            }
            
            isAuthenticated = true;
          }
        } catch (error) {
          console.error('Firebase token verification error in admin middleware:', error);
          // Clear invalid token
          const response = NextResponse.redirect(new URL('/auth/signin', request.url));
          response.cookies.set('firebase_token', '', { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0,
            path: '/'
          });
          return response;
        }
      }
    }
    
    // If not authenticated through either method, redirect to login
    if (!isAuthenticated || !userId) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Verify admin status using unified verification
    const isAdmin = await verifyIsAdmin(userId);
    
    if (!isAdmin) {
      // User doesn't have admin privileges, redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // User is admin, prepare response with auth headers
    const response = NextResponse.next();
    response.headers.set('x-auth-status', 'authenticated');
    
    if (session) {
      response.headers.set('x-auth-provider', 'supabase');
      response.headers.set('x-supabase-user', user.id);
      
      // Add role information if available in metadata
      if (user.app_metadata?.role) {
        response.headers.set('x-user-role', user.app_metadata.role as string);
      }
      
      if (user.app_metadata?.is_admin === true) {
        response.headers.set('x-supabase-admin', 'true');
      }
    } else if (userId) {
      response.headers.set('x-auth-provider', 'firebase');
      response.headers.set('x-firebase-uid', userId);
      response.headers.set('x-firebase-admin', 'true');
    }
    
    return response;
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    
    // If any error occurs, redirect to error page
    return NextResponse.redirect(new URL('/error', request.url));
  }
} 