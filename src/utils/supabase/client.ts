import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { logger } from '@/utils/logger'

// Use a type alias for our Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>

// Create a singleton instance to avoid multiple client creations
let supabaseClient: TypedSupabaseClient | null = null

/**
 * Check if Supabase configuration is available
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Create a Supabase client for browser environments
 * Uses cookie-based session management to ensure compatibility with SSR
 */
export function createClient(): TypedSupabaseClient {
  if (supabaseClient) {
    logger.debug('[Supabase] Returning existing client instance');
    return supabaseClient;
  }

  if (!isSupabaseConfigured()) {
    logger.error('Supabase environment variables not configured');
    throw new Error('Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  try {
    // Only proceed if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Supabase client should only be initialized in browser environments');
    }

    // Initialize the Supabase client with cookie-based session management
    const options = {
      auth: {
        flowType: 'pkce' as const,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
          // Use cookies for session storage
          getItem: (key: string) => {
            const item = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${key}=`))
            return item ? item.split('=')[1] : null
          },
          setItem: (key: string, value: string) => {
            document.cookie = `${key}=${value}; path=/; secure; samesite=lax`
          },
          removeItem: (key: string) => {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          }
        }
      },
      // Set global error handler
      global: {
        fetch: (...args: Parameters<typeof fetch>) => {
          return fetch(...args).catch(error => {
            logger.error(`[Supabase] Fetch error:`, error);
            throw error;
          });
        }
      }
    };

    logger.debug('[Supabase] Creating new client with cookie-based session storage');
    
    supabaseClient = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      options
    );
    
    // Validate the client was created successfully
    if (!supabaseClient?.auth) {
      throw new Error('Supabase client auth object is undefined after initialization');
    }
    
    logger.debug('[Supabase] Client successfully initialized');
    
    return supabaseClient;
  } catch (error) {
    logger.error('Error creating Supabase client:', error);
    throw new Error('Failed to initialize Supabase client: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// For backward compatibility
export const createBrowserClient = createClient;

// Initialize in browser environments only
export const supabase = typeof window !== 'undefined' ? createClient() : null;

// Singleton instance for convenience - only created on client side
export let supabaseSingleton: TypedSupabaseClient;

// Initialize on client side only to avoid SSR issues
if (typeof window !== 'undefined') {
  try {
    supabaseSingleton = createClient();
  } catch (e) {
    logger.error('Failed to initialize static supabase client:', e as Error);
    // Create empty object that will be initialized later when properly accessed
    supabaseSingleton = {} as TypedSupabaseClient;
  }
} else {
  // Create placeholder for server side
  supabaseSingleton = {} as TypedSupabaseClient;
} 