'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { AUTH_STATUS, AUTH_PATHS, type AuthStatus } from '@/utils/auth';

// Type for authenticated user data
export type AuthUser = User | null;

// Authentication state
export interface AuthState {
  user: AuthUser;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: (forceClear?: boolean) => Promise<void>;
  checkAuthStatus: () => Promise<{ user: User | null; session: Session | null; }>;
  getToken: () => Promise<string | null>;
}

/**
 * Custom hook for handling authentication in client components
 * Provides methods for sign-in, sign-up, sign-out and authentication state management
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });
  
  const router = useRouter();
  
  // Initialize Supabase client
  const supabase = createClient();

  // Force debug mode active immediately for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for debug flags from localStorage
      const isDebugMode = localStorage.getItem('debug_direct_access') === 'true';
      
      if (isDebugMode) {
        console.log('DEBUG MODE: Activating immediate auth bypass');
        
        // Create a mock user
        const mockUser = {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { role: 'editor' },
          app_metadata: { role: 'editor' },
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as User;
        
        // Set auth state immediately
        setState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      }
    }
  }, []);

  // Check the current authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      // Check for debug direct access mode
      if (typeof window !== 'undefined' && localStorage.getItem('debug_direct_access') === 'true') {
        console.log('DEBUG MODE: Using direct access authentication bypass');
        
        // Get mock user data or create default
        let mockUser: User;
        try {
          const storedMockUser = localStorage.getItem('debug_mock_user');
          if (storedMockUser) {
            const userData = JSON.parse(storedMockUser);
            mockUser = {
              id: userData.id || 'test-user-id',
              email: userData.email || 'test@example.com',
              user_metadata: { role: userData.role || 'editor' },
              app_metadata: { role: userData.role || 'editor' },
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as User;
          } else {
            mockUser = {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { role: 'editor' },
              app_metadata: { role: 'editor' },
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as User;
          }
        } catch (e) {
          console.error('Error parsing mock user:', e);
          mockUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { role: 'editor' },
            app_metadata: { role: 'editor' },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as User;
        }
        
        setState(prev => ({
          ...prev,
          user: mockUser,
          isAuthenticated: true,
          isLoading: false
        }));
        
        return { 
          user: mockUser, 
          session: { 
            access_token: 'mock-token',
            user: mockUser 
          } as Session 
        };
      }
      
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      const user = data?.session?.user || null;
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        isLoading: false
      }));
      
      return { user, session: data.session };
    } catch (error: any) {
      logger.error('Error checking auth status:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      
      return { user: null, session: null };
    }
  }, [supabase]);

  // Get authentication token
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check for debug mode
      if (typeof window !== 'undefined' && localStorage.getItem('debug_direct_access') === 'true') {
        console.log('DEBUG MODE: Returning mock authentication token');
        return 'mock-debug-token-for-testing-only';
      }
      
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // Try to get existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        return session.access_token;
      }
      
      // Try to refresh the token
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Error refreshing token:', error);
        return null;
      }
      
      return data.session?.access_token || null;
    } catch (error) {
      logger.error('Error getting token:', error);
      return null;
    }
  }, [supabase]);
  
  // Sign in with email and password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      await checkAuthStatus();
    } catch (error: any) {
      logger.error('Sign in error:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [supabase, checkAuthStatus]);
  
  // Sign up with email and password
  const signUpWithEmail = useCallback(async (
    email: string, 
    password: string,
    redirectTo: string = `${window.location.origin}/auth/callback`
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo
        }
      });
      
      if (error) throw error;
      
      // User needs to verify email, don't update authenticated status
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      logger.error('Sign up error:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [supabase]);
  
  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async (
    redirectTo: string = `${window.location.origin}/auth/callback`
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });
      
      if (error) throw error;
      
      // Redirect happens automatically, no need to update state
    } catch (error: any) {
      logger.error('Google sign in error:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [supabase]);
  
  // Sign out
  const signOut = useCallback(async (forceClear: boolean = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // First try the API endpoint for more thorough signout
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // If API call was successful, server-side session is cleared
        if (response.ok) {
          logger.debug('Server-side sign out successful');
        }
      } catch (apiError) {
        // If API call fails, continue with client-side signout
        logger.warn('Server-side sign out failed, continuing with client-side signout:', apiError);
      }
      
      // Client-side signout
      const { error } = await supabase.auth.signOut({
        scope: forceClear ? 'global' : 'local' // Use global to invalidate all sessions if forceClear is true
      });
      
      if (error) throw error;
      
      // Update state
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      // Clear any localStorage tokens manually
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        
        // Clear any additional auth-related items
        if (forceClear) {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
      
      // Redirect to sign-in page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    } catch (error: any) {
      logger.error('Sign out error:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [supabase]);
  
  // Subscribe to auth changes
  useEffect(() => {
    if (!supabase) return;
    
    // Initial auth check
    checkAuthStatus();
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        logger.info(`Auth state changed: ${event}`);
        
        const user = session?.user || null;
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: !!user,
          isLoading: false
        }));
      }
    );
    
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, checkAuthStatus]);
  
  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    checkAuthStatus,
    getToken
  };
}

// Also export the useAuthContext hook for direct access to the Supabase-only auth context
export { useAuthContext } from '@/providers/AuthProvider'; 