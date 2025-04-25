'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isPublicRoute } from '@/middleware';
import { createBrowserClient } from '@/utils/supabase/client';
import { getAuthStatusEndpoint, getDashboardEndpoint, getLoginEndpoint } from '@/utils/endpoints';
import { logger } from '@/utils/logger';
import { AuthChangeEvent } from '@supabase/supabase-js';

// Define the shape of our auth user
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role?: string;
};

// Define the auth context state shape
type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  checkAuth: async () => {},
  signOut: async () => {},
  getToken: async () => null,
});

// Hook to use the auth context
export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Checks the current authentication status
   */
  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // First try to get session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // If we have a session, get the full user data including role from API
        const response = await fetch(getAuthStatusEndpoint(), {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          // Fallback to basic user data from session if API call fails
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      logger.error('Error checking auth status:', err);
      setError('Failed to verify authentication status');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Signs the user out
   */
  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      router.push(getLoginEndpoint());
    } catch (err) {
      logger.error('Error signing out:', err);
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gets the current auth token
   */
  const getToken = async (): Promise<string | null> => {
    try {
      // Get session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (err) {
      logger.error('Error getting auth token:', err);
      return null;
    }
  };

  // Check auth when component mounts
  useEffect(() => {
    checkAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkAuth();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle redirect based on auth state and current route
  useEffect(() => {
    if (isLoading) return;

    const handleAuthRedirect = async () => {
      try {
        // Don't redirect if on a public route
        if (isPublicRoute(pathname)) return;

        // If not authenticated and on protected route, redirect to login
        if (!user && !isPublicRoute(pathname)) {
          router.push(`${getLoginEndpoint()}?redirectTo=${encodeURIComponent(pathname)}`);
        }
      } catch (err) {
        logger.error('Error handling auth redirect:', err);
      }
    };

    handleAuthRedirect();
  }, [user, isLoading, pathname]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    checkAuth,
    signOut,
    getToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
} 