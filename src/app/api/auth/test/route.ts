import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getAuthAdmin, getFirebaseAdmin } from '@/utils/firebase-admin';

/**
 * API route to test authentication
 * This endpoint validates user auth from either Firebase or Supabase
 */
export async function GET(request: NextRequest) {
  try {
    // Get cookie store
    const cookieStore = cookies();
    
    // Try Supabase authentication first
    const supabase = createClient(cookieStore);
    const { data: { session: supabaseSession }, error: supabaseError } = await supabase.auth.getSession();
    
    if (supabaseSession?.user) {
      return NextResponse.json({
        authenticated: true,
        provider: 'supabase',
        user: {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email,
          role: supabaseSession.user.app_metadata?.role || 'viewer',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // If Supabase auth fails, try Firebase
    const firebaseToken = cookieStore.get('firebase_token')?.value;
    
    if (firebaseToken) {
      try {
        // Initialize Firebase admin and get auth instance
        const admin = getFirebaseAdmin();
        const auth = getAuthAdmin();
        
        // Verify the token
        const decodedToken = await auth.verifyIdToken(firebaseToken);
        
        return NextResponse.json({
          authenticated: true,
          provider: 'firebase',
          user: {
            id: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'viewer',
          },
          timestamp: new Date().toISOString(),
        });
      } catch (firebaseError) {
        console.error('Firebase token verification error:', firebaseError);
        return NextResponse.json(
          { 
            error: 'Invalid Firebase token',
            details: firebaseError instanceof Error ? firebaseError.message : 'Unknown error',
          },
          { status: 401 }
        );
      }
    }
    
    // No valid authentication found
    return NextResponse.json(
      { error: 'Not authenticated' }, 
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { error: 'Authentication error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 