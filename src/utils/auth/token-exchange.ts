import { createClient } from '@supabase/supabase-js';
import { authAdmin } from '@/utils/firebase-admin';
import type { Database } from '@/types/supabase';

type TokenExchangeOptions = {
  createSupabaseAccountIfMissing?: boolean;
  syncUserData?: boolean;
};

/**
 * Exchanges a Firebase ID token for a Supabase session
 * This allows integration between Firebase Auth and Supabase Auth
 */
export async function exchangeFirebaseTokenForSupabaseSession(
  firebaseToken: string,
  options: TokenExchangeOptions = {}
) {
  const {
    createSupabaseAccountIfMissing = true,
    syncUserData = true,
  } = options;

  try {
    // Verify the Firebase token
    const firebaseUser = await authAdmin.verifyIdToken(firebaseToken);
    
    if (!firebaseUser.email) {
      throw new Error('Firebase user has no email');
    }

    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing Supabase URL environment variable');
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase service role key environment variable');
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
      // Look up user in Supabase
      const { data: existingUser, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
        filter: {
          email: firebaseUser.email
        }
      });

      if (userLookupError) {
        console.error('Supabase user lookup error:', userLookupError);
        
        // For "User not allowed" errors, it's likely a service role issue
        if (userLookupError.message === 'User not allowed') {
          throw new Error('Supabase service role key permissions issue - cannot list users');
        }
        
        throw new Error(`Error looking up user in Supabase: ${userLookupError.message}`);
      }

      // If the user doesn't exist in Supabase and we're allowed to create one
      if (!existingUser || existingUser.users.length === 0) {
        if (!createSupabaseAccountIfMissing) {
          throw new Error('User does not exist in Supabase and account creation is disabled');
        }

        // Create a new user in Supabase to match the Firebase user
        try {
          const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: firebaseUser.email,
            email_confirm: true,
            user_metadata: {
              full_name: firebaseUser.name,
              avatar_url: firebaseUser.picture,
              firebase_uid: firebaseUser.uid,
              provider: 'firebase',
            },
          });

          if (createUserError) {
            throw new Error(`Error creating Supabase user: ${createUserError.message}`);
          }
        } catch (createError) {
          console.error('Failed to create Supabase user:', createError);
          throw new Error(`Failed to create Supabase account: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
        }
      } else if (syncUserData && existingUser.users.length > 0) {
        // Update existing user metadata with Firebase info
        const supabaseUserId = existingUser.users[0].id;
        
        try {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            user_metadata: {
              ...existingUser.users[0].user_metadata,
              firebase_uid: firebaseUser.uid,
              avatar_url: firebaseUser.picture || existingUser.users[0].user_metadata?.avatar_url,
              full_name: firebaseUser.name || existingUser.users[0].user_metadata?.full_name,
              provider: 'firebase',
              last_sign_in: new Date().toISOString(),
            },
          });

          if (updateError) {
            console.warn(`Warning: Could not update Supabase user metadata: ${updateError.message}`);
            // Continue anyway, this is non-critical
          }
        } catch (updateError) {
          console.warn('Warning: Failed to update Supabase user:', updateError);
          // Continue anyway, this is non-critical
        }
      }

      // Create a new session for the Supabase user
      try {
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: firebaseUser.email,
        });

        if (sessionError || !sessionData) {
          throw new Error(`Error generating Supabase session: ${sessionError?.message || 'No session data returned'}`);
        }

        // Return the properties needed to create a session
        return {
          access_token: sessionData.properties.access_token,
          refresh_token: sessionData.properties.refresh_token,
          expires_in: 3600,
        };
      } catch (sessionError) {
        console.error('Failed to generate Supabase session:', sessionError);
        throw new Error(`Failed to generate Supabase session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
      }
    } catch (supabaseError) {
      // If we can't use Supabase admin functions but have a Firebase user,
      // just return a mock session to allow the app to work with Firebase auth only
      if (process.env.NODE_ENV === 'development') {
        console.warn('DEVELOPMENT MODE: Returning mock session for development. Firebase authentication will still work.');
        return {
          access_token: 'mock_access_token_for_development',
          refresh_token: 'mock_refresh_token_for_development',
          expires_in: 3600,
        };
      }
      
      throw supabaseError;
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

/**
 * Sets Supabase cookies based on session data
 */
export function setSupabaseCookies(
  response: Response,
  sessionData: { access_token: string; refresh_token: string; expires_in: number }
) {
  // Set access token cookie
  response.headers.append(
    'Set-Cookie',
    `sb-access-token=${sessionData.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionData.expires_in}`
  );

  // Set refresh token cookie with a longer expiry
  response.headers.append(
    'Set-Cookie',
    `sb-refresh-token=${sessionData.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}` // 7 days
  );

  return response;
} 