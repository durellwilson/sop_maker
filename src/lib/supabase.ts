import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getFirebaseAuth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

let supabaseInstance: SupabaseClient | null = null;

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate required Supabase configuration
const validateSupabaseConfig = (): boolean => {
  if (!supabaseUrl) {
    logger.error('Missing required Supabase URL');
    return false;
  }
  
  if (!supabaseAnonKey) {
    logger.error('Missing required Supabase anonymous key');
    return false;
  }
  
  return true;
};

/**
 * Initialize Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!validateSupabaseConfig()) {
    throw new Error('Invalid Supabase configuration. Check your environment variables.');
  }
  
  try {
    return createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (error) {
    logger.error('Error initializing Supabase client:', error);
    throw error;
  }
};

// Initialize client
const supabaseClient = getSupabaseClient();

/**
 * Supabase authentication functions
 */
export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      logger.error('Supabase email sign-in error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign up with email and password
   */
  signUpWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      logger.error('Supabase email sign-up error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign in with custom token (for Firebase integration)
   */
  signInWithToken: async (firebaseToken: string) => {
    try {
      // Call your backend endpoint that verifies the Firebase token and returns a Supabase token
      const response = await fetch('/api/auth/supabase-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to exchange token');
      }
      
      const { supabaseToken } = await response.json();
      
      // Sign in to Supabase with the custom token
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: 'dummy@example.com', // This will be overridden by the JWT claims
        password: supabaseToken
      });
      
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      logger.error('Supabase token sign-in error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Sign out
   */
  signOut: async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      logger.error('Supabase sign-out error:', error);
      return { error: error.message };
    }
  },
  
  /**
   * Get the current session
   */
  getSession: async () => {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error: any) {
      logger.error('Supabase get session error:', error);
      return { session: null, error: error.message };
    }
  },
  
  /**
   * Get the current user
   */
  getUser: async () => {
    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      logger.error('Supabase get user error:', error);
      return { user: null, error: error.message };
    }
  },
  
  /**
   * Set Supabase session with custom JWT token
   */
  setSession: async (accessToken: string) => {
    try {
      const { data, error } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Not using refresh tokens in this integration pattern
      });
      
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error: any) {
      logger.error('Supabase set session error:', error);
      return { session: null, error: error.message };
    }
  },
  
  /**
   * Register auth state change listener
   */
  onAuthStateChange: (callback: (user: User | null) => void) => {
    const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        callback(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
    
    return data.subscription.unsubscribe;
  }
};

// Export Supabase instance
export const supabase = {
  client: supabaseClient,
  auth: supabaseAuth
};

export default supabase; 