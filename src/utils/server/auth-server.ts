import { cookies, headers } from 'next/headers';
import { createServerSupabaseClient, executeSql } from './supabase-server';
import { authAdmin } from '@/utils/firebase-admin';
import { randomUUID } from 'crypto';
import { verifySessionCookie } from './firebase-admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the Firebase ID token from the Authorization header
 */
export function getAuthToken() {
  const authHeader = headers().get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  return idToken;
}

/**
 * Get the session cookie from the cookies
 */
export async function getSessionCookie() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    return sessionCookie;
  } catch (error) {
    console.error('Error getting session cookie:', error);
    return null;
  }
}

/**
 * Get the Supabase session cookie
 */
export async function getSupabaseSession() {
  try {
    const cookieStore = await cookies();
    // Supabase uses the sb-{PROJECT_REF}-auth-token cookie
    const supabaseCookies = cookieStore.getAll().filter(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
    
    if (supabaseCookies.length > 0) {
      // Just return the first one we find
      return supabaseCookies[0].value;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Supabase session cookie:', error);
    return null;
  }
}

/**
 * Verify the session cookie
 */
export async function verifySessionCookie(sessionCookie: string) {
  try {
    const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie);
    return decodedClaims;
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return null;
  }
}

/**
 * Verify the ID token
 */
export async function verifyIdToken(idToken: string) {
  try {
    // Will throw if the token is invalid
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Helper function to get a user's UUID in the database from their Firebase UID
 */
export async function getUserIdByFirebaseUid(firebaseUid: string) {
  try {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }
    
    // Try to find the user by Firebase UID
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (error || !data) {
      console.log('User not found by Firebase UID:', firebaseUid);
      return null;
    }
    
    return data.id; // Return the UUID
  } catch (error) {
    console.error('Error getting user by Firebase UID:', error);
    return null;
  }
}

/**
 * Verify the current user from the session cookie or token
 * Returns the user object if authenticated, null otherwise
 */
export async function verifyCurrentUser() {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check if we have an active Supabase session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
      console.log('User authenticated via Supabase session');
      
      // Look up the user in our users table to ensure we have a record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (userData) {
        // User exists in our database
        return {
          id: userData.id,
          email: userData.email,
          user_metadata: {
            name: userData.name
          }
        };
      }
      
      // User authenticated but not in our database yet
      // Return the session user info
      return {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata || {
          name: session.user.email?.split('@')[0] || 'User'
        }
      };
    }
    
    // For development only - provide a dev user if enabled
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true') {
      console.log('Using development user');
      return {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // UUID format
        email: 'dev@example.com',
        user_metadata: {
          name: 'Development User'
        }
      };
    }
    
    // No valid authentication found
    return null;
  } catch (error) {
    console.error('Error in verifyCurrentUser:', error);
    return null;
  }
}

/**
 * Middleware to verify user is authenticated
 */
export async function authenticateRequest(request: NextRequest) {
  const user = await verifyCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  
  return user;
}

/**
 * Checks if the current user is authenticated
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const user = await verifyCurrentUser();
  return !!user;
}

/**
 * Get user ID from the database based on authentication ID
 */
export async function getUserIdByAuthId(authId: string) {
  try {
    const query = `
      SELECT id FROM users 
      WHERE auth_id = $1 OR firebase_uid = $1
      LIMIT 1
    `;
    
    const result = await executeSql(query, [authId]);
    return result && result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error('Error getting user ID by auth ID:', error);
    return null;
  }
}

/**
 * Ensure dev user exists in the database
 * This is used only in development mode
 */
export async function ensureDevUserExists() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  // In development mode with dev user, always return a consistent ID
  // Use a valid UUID for the dev user
  const devUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  
  try {
    // Check if any user exists - but don't fail if this doesn't work
    try {
      const checkQuery = 'SELECT id FROM users LIMIT 1';
      const checkResult = await executeSql(checkQuery);
      
      if (checkResult && checkResult.length > 0) {
        console.log('DEV MODE: Using existing user from database:', checkResult[0].id);
        return checkResult[0].id;
      }
    } catch (checkError) {
      console.warn('DEV MODE: Error checking for existing users:', checkError);
    }
    
    // Try to create a user if needed
    try {
      const createQuery = `
        INSERT INTO users (id, email, name, firebase_uid, created_at, updated_at)
        VALUES ($1, 'dev@example.com', 'Development User', 'dev-firebase-uid', NOW(), NOW())
        RETURNING id
      `;
      
      const createResult = await executeSql(createQuery, [devUserId]);
      
      if (createResult && createResult.length > 0 && createResult[0].id) {
        console.log('DEV MODE: Created development user:', createResult[0].id);
        return createResult[0].id;
      }
    } catch (createError) {
      console.warn('DEV MODE: Error creating user:', createError);
    }
    
    // If all else fails, return the hardcoded ID
    console.log('DEV MODE: Using hardcoded user ID:', devUserId);
    return devUserId;
  } catch (error) {
    console.error('DEV MODE: Error ensuring dev user exists:', error);
    // Always return a user ID even if there's an error
    console.log('DEV MODE: Using fallback user ID after error:', devUserId);
    return devUserId;
  }
} 