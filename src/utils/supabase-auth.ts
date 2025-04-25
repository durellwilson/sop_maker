import { supabase } from '@/utils/supabase';
import { useState, useEffect } from 'react';

/**
 * Get the current Supabase session token
 * @returns The access token or null if not authenticated
 */
export async function getSupabaseToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Return the token if we have it
    if (session?.access_token) {
      return session.access_token;
    }
    
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
    
    if (error) {
      console.error('Error refreshing Supabase token:', error);
      
      // In development mode, return a mock token
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock token in development mode');
        return 'dev-mode-mock-token';
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Supabase token:', error);
    
    // In development mode, return a mock token
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock token in development mode after error');
      return 'dev-mode-mock-token';
    }
    
    return null;
  }
}

/**
 * Simple hook for getting authentication state that doesn't depend on Firebase
 * Use this instead of hooks that might try to initialize Firebase
 */
export const useSupabaseAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for Supabase session on mount
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking Supabase session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getToken = async () => {
    const token = await getSupabaseToken();
    
    if (!token && process.env.NODE_ENV === 'development') {
      console.log('Returning mock token in development mode from getToken()');
      return 'dev-mode-mock-token';
    }
    
    return token;
  };
  
  // Additional methods to match the Firebase auth interface
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  };

  // Method for Firebase compatibility
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithSupabase = async (email?: string, password?: string) => {
    if (email && password) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase sign in error:', error);
        throw error;
      }
    }
    
    // Refresh session if no credentials provided
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  };
  
  return {
    user,
    currentUser: user, // For compatibility with older components
    loading,
    isLoading: loading, // For compatibility
    isAuthenticated: !!user,
    getToken,
    signOut,
    signInWithGoogle,
    signInWithSupabase,
    signInWithEmail: signInWithSupabase, // Alias for compatibility
  };
}; 