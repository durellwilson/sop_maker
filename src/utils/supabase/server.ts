import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from '@/types/database.types';
import { cache } from 'react';
import { type SupabaseClient } from '@supabase/supabase-js';

// Type alias for consistency with client.ts
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Create a Supabase client for use in server components or API routes
 * This function is cached to prevent creating multiple clients in a single render
 */
export const createServerSupabaseClient = cache((): TypedSupabaseClient => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'strict' | 'lax' | 'none' }) {
          cookieStore.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          cookieStore.set({
            name,
            value: '',
            maxAge: 0,
            ...options,
          });
        },
      },
    }
  );
});

// Alias for backward compatibility
export const createClient = createServerSupabaseClient;

/**
 * Get the current authenticated user from the Supabase session
 * Returns null if no user is authenticated
 */
export async function getAuthenticatedUser() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  return session.user;
}

/**
 * Check if the current request is authenticated
 * Returns true if a user is logged in, false otherwise
 */
export async function isAuthenticated() {
  const user = await getAuthenticatedUser();
  return !!user;
}

/**
 * Check if the current user has the given role
 * Returns true if the user has the role, false otherwise
 */
export async function hasRole(role: string) {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return false;
  }
  
  // Get user's roles from Supabase
  const { data, error } = await createServerSupabaseClient()
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  return data.role === role;
}

/**
 * Create a Supabase client with admin privileges for server-side operations
 * Uses the service role key, so it should only be used in trusted server contexts
 */
export function createAdminServerClient(): TypedSupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set() {
          // Don't set cookies when using the service role
        },
        remove() {
          // Don't remove cookies when using the service role
        },
      },
    }
  );
}

// Alias for backward compatibility
export const createAdminClient = createAdminServerClient;

/**
 * Get the current session from Supabase
 * This is a more comprehensive function that returns both the session and user
 */
export async function getSession() {
  try {
    // Create a fresh client
    const client = createServerSupabaseClient();
    
    // Get the session with proper error handling
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { session: null, user: null };
    }
    
    return { 
      session: data.session,
      user: data.session?.user || null
    };
  } catch (err) {
    console.error('Unexpected error getting session:', err);
    return { session: null, user: null };
  }
}

// --- Remove old implementation relying on cookies --- 
/*
export async function createClient(cookieStore?: any) {
  try {
    // Use provided cookie store or get from next/headers
    const cookieJar = cookieStore || await cookies();
    
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // ... old cookie logic ...
        },
      }
    );
  } catch (error) {
    // ... old error handling ...
  }
}

export async function createAdminClient() {
  try {
    // ... old admin client with cookie logic ...
  } catch (error) {
    // ... old error handling ...
  }
}
*/ 