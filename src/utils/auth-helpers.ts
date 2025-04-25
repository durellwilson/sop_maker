import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { firebaseAdmin } from '@/utils/firebase-admin';

/**
 * Server-side function to get the current user session
 * Tries both Supabase and Firebase authentication methods
 */
export async function getSession() {
  try {
    const cookieStore = cookies();
    
    // Try to get Supabase session first
    const supabase = createClient(cookieStore);
    const { data: { session: supabaseSession } } = await supabase.auth.getSession();
    
    if (supabaseSession) {
      return {
        provider: 'supabase',
        user: {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email,
          name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.email,
          role: supabaseSession.user.user_metadata?.role || 'viewer',
        },
        supabaseSession
      };
    }
    
    // If no Supabase session, try Firebase
    // Use await to get the cookie value
    const firebaseTokenCookie = await cookieStore.get('firebase_token');
    const firebaseToken = firebaseTokenCookie?.value;
    
    if (firebaseToken) {
      try {
        const decodedToken = await firebaseAdmin.verifyIdToken(firebaseToken);
        
        return {
          provider: 'firebase',
          user: {
            id: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email,
            role: decodedToken.role || 'viewer',
          },
          firebaseToken: decodedToken
        };
      } catch (error) {
        console.error('Error verifying Firebase token:', error);
        // Continue to return null
      }
    }
    
    // No valid session found
    return { provider: null, user: null };
  } catch (error) {
    console.error('Session check error:', error);
    return { provider: null, user: null, error };
  }
} 