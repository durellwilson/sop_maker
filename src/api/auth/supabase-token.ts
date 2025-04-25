import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { createClient } from '@supabase/supabase-js';
import { initAdmin } from '@/lib/firebase-admin';

// Add flag for Supabase-only mode
const SUPABASE_ONLY_MODE = true;

// Initialize Firebase Admin if not already initialized and not in Supabase-only mode
if (!SUPABASE_ONLY_MODE) {
  initAdmin();
}

// Supabase admin client (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Constants
const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days in seconds

export async function POST(request: Request) {
  // Check if we're in Supabase-only mode
  if (SUPABASE_ONLY_MODE) {
    return NextResponse.json(
      { error: 'Token exchange endpoint is disabled in Supabase-only mode' },
      { status: 400 }
    );
  }

  try {
    // Validate request
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type, expected application/json' },
        { status: 400 }
      );
    }

    // Parse request body
    const { firebaseToken } = await request.json();
    
    if (!firebaseToken) {
      return NextResponse.json(
        { error: 'Missing required parameter: firebaseToken' },
        { status: 400 }
      );
    }

    // Verify Firebase token
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await getAuth().verifyIdToken(firebaseToken);
    } catch (error: any) {
      console.error('Firebase token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid Firebase token', details: error.message },
        { status: 401 }
      );
    }

    // Extract user info from Firebase token
    const { uid, email, email_verified, name, picture, firebase } = decodedToken;
    
    // Extract custom claims if any (for role-based access)
    const role = decodedToken.role || 'viewer'; // Default to viewer if no role specified
    
    // Try to get existing user first
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(uid);

    if (getUserError && getUserError.message !== 'User not found') {
      console.error('Error checking existing user:', getUserError);
      return NextResponse.json(
        { error: 'Failed to check existing user', details: getUserError.message },
        { status: 500 }
      );
    }

    // Update or create user
    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
        email: email,
        email_confirm: email_verified || false,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: uid,
          provider: firebase?.sign_in_provider,
          role
        },
        app_metadata: {
          firebase_uid: uid,
          role
        }
      });

      if (updateError) {
        console.error('Error updating Supabase user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update Supabase user', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new user
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: email_verified || false,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          firebase_uid: uid,
          provider: firebase?.sign_in_provider,
          role
        },
        app_metadata: {
          firebase_uid: uid,
          role
        },
        id: uid // Ensure Supabase and Firebase have matching IDs
      });

      if (createError) {
        console.error('Error creating Supabase user:', createError);
        return NextResponse.json(
          { error: 'Failed to create Supabase user', details: createError.message },
          { status: 500 }
        );
      }
    }

    // Create a new session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      userId: uid,
      expiresIn: SESSION_EXPIRY
    });

    if (sessionError) {
      console.error('Error creating Supabase session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create Supabase session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Set auth cookies
    const cookieStore = cookies();
    cookieStore.set('sb-access-token', sessionData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_EXPIRY,
      path: '/',
      sameSite: 'lax'
    });
    
    cookieStore.set('sb-refresh-token', sessionData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_TOKEN_EXPIRY,
      path: '/',
      sameSite: 'lax'
    });

    // Return the token to client
    return NextResponse.json({
      supabaseToken: sessionData.access_token,
      user: {
        id: uid,
        email,
        role
      }
    });
    
  } catch (error: any) {
    console.error('Unexpected error in token exchange:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 