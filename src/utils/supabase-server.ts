import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

/**
 * Create a Supabase client for use in server components or API routes
 */
export function createServerSupabaseClient() {
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
}

// Legacy alias for backward compatibility
export const createClient = createServerSupabaseClient;

/**
 * Create a Supabase client with admin privileges for server-side operations
 * Uses the service role key, so it should only be used in trusted server contexts
 */
export function createAdminServerClient() {
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
          // Don't set cookies when using service role
        },
        remove() {
          // Don't remove cookies when using service role
        },
      },
    }
  );
}

// Legacy alias for backward compatibility
export const createAdminClient = createAdminServerClient; 