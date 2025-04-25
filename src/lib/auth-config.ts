/**
 * Authentication configuration
 * 
 * This file centralizes authentication settings to ensure consistency
 * across the application and make it easier to manage auth providers.
 */

// The authentication provider to use
export const AUTH_PROVIDER = 'supabase';

// Configuration for Google OAuth in Supabase
export const GOOGLE_AUTH_CONFIG = {
  provider: 'google',
  options: {
    redirectTo: typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback` 
      : undefined,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    }
  }
};

// Helper function to determine if we're using mock data in dev mode
export const isDevMode = () => {
  return process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true';
};

// Environment-specific configuration
export const AUTH_CONFIG = {
  persistSession: true,
  detectSessionInUrl: true,
  autoRefreshToken: true,
}; 