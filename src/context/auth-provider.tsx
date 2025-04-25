'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { auth as firebaseAuth, firebaseAuth as firebaseAuthClient, getFirebaseToken, onFirebaseTokenChange } from '@/lib/firebase';
import { supabase, supabaseAuth } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Add a flag for Supabase-only mode
const SUPABASE_ONLY_MODE = true;

// User role type
export type UserRole = 'admin' | 'editor' | 'viewer';

// Define unified AuthUser type
export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  provider: 'firebase' | 'supabase';
  firebaseUser?: FirebaseUser;
  supabaseUser?: SupabaseUser;
};

// Auth context type definition
export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<AuthUser | null>;
  signUp: (email: string, password: string, name: string) => Promise<AuthUser | null>;
  signInWithGoogle: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  provider: 'firebase' | 'supabase' | null;
  setError: (error: Error | null) => void;
  debug: {
    lastAuthCheck: string;
    authEvents: string[];
  };
};

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => { throw new Error('Not implemented'); },
  signUp: async () => { throw new Error('Not implemented'); },
  signInWithGoogle: async () => { throw new Error('Not implemented'); },
  signOut: async () => {},
  refreshSession: async () => {},
  provider: null,
  setError: () => {},
  debug: {
    lastAuthCheck: '',
    authEvents: [],
  },
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [provider, setProvider] = useState<'firebase' | 'supabase' | null>(SUPABASE_ONLY_MODE ? 'supabase' : null);
  const [debugState, setDebugState] = useState({
    lastAuthCheck: '',
    authEvents: [] as string[],
  });
  
  const router = useRouter();
  const pathname = usePathname();
  
  // Add an event to debug log
  const addDebugEvent = useCallback((event: string) => {
    logger.debug(`Auth Event: ${event}`);
    setDebugState(prev => ({
      ...prev,
      authEvents: [...prev.authEvents.slice(-9), event],
    }));
  }, []);
  
  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser | null> => {
    setLoading(true);
    setError(null);
    
    try {
      addDebugEvent('Attempting sign in with email');
      
      if (SUPABASE_ONLY_MODE) {
        // Only try Supabase auth
        const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAuth.signInWithEmail(email, password);
        
        if (supabaseError) {
          addDebugEvent(`Supabase auth failed: ${supabaseError.message}`);
          throw supabaseError;
        }
        
        if (supabaseUser) {
          addDebugEvent('Supabase auth successful');
          return null; // Auth state will be updated by listeners
        }
        
        throw new Error('Authentication failed');
      }
      
      // Try Firebase first (primary provider)
      const { user: firebaseUser, error: firebaseError } = await firebaseAuthClient.signInWithEmail(email, password);
      
      if (firebaseUser) {
        // Get token to update Supabase state
        const token = await firebaseUser.getIdToken();
        
        try {
          // Call token exchange API
          await fetch('/api/auth/supabase-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseToken: token }),
          });
          
          addDebugEvent('Firebase auth successful, exchanged token for Supabase');
        } catch (tokenError) {
          logger.error('Failed to exchange token:', tokenError);
          addDebugEvent('Firebase auth successful, but token exchange failed');
        }
        
        return null; // Auth state will be updated by listeners
      }
      
      if (firebaseError) {
        addDebugEvent(`Firebase auth failed: ${firebaseError}`);
        logger.warn('Firebase authentication failed, trying Supabase', firebaseError);
        
        // If Firebase fails, try Supabase
        const { user: supabaseUser, error: supabaseError } = await supabaseAuth.signInWithEmail(email, password);
        
        if (supabaseError) {
          addDebugEvent(`Supabase auth failed: ${supabaseError}`);
          throw new Error(supabaseError);
        }
        
        if (supabaseUser) {
          addDebugEvent('Supabase auth successful');
          return null; // Auth state will be updated by listeners
        }
      }
      
      throw new Error('Authentication failed with both providers');
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      addDebugEvent(`Sign in error: ${errorInstance.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [addDebugEvent]);
  
  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, name: string): Promise<AuthUser | null> => {
    setLoading(true);
    setError(null);
    
    try {
      addDebugEvent('Attempting sign up with email');
      
      if (SUPABASE_ONLY_MODE) {
        // Only try Supabase auth
        const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAuth.signUpWithEmail(email, password);
        
        if (supabaseError) {
          addDebugEvent(`Supabase sign up failed: ${supabaseError.message}`);
          throw supabaseError;
        }
        
        if (supabaseUser) {
          addDebugEvent('Supabase sign up successful');
          return null; // Auth state will be updated by listeners
        }
        
        throw new Error('Sign up failed');
      }
      
      // Try Firebase first (primary provider)
      const { user: firebaseUser, error: firebaseError } = await firebaseAuthClient.signUpWithEmail(email, password);
      
      if (firebaseUser) {
        // Update profile with display name
        try {
          await firebaseUser.updateProfile({
            displayName: name,
          });
          
          // Get token to update Supabase state
          const token = await firebaseUser.getIdToken();
          
          // Call token exchange API
          await fetch('/api/auth/supabase-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseToken: token }),
          });
          
          addDebugEvent('Firebase sign up successful, exchanged token for Supabase');
        } catch (updateError) {
          logger.error('Failed to update user profile or exchange token:', updateError);
          addDebugEvent('Firebase sign up successful, but profile update or token exchange failed');
        }
        
        return null; // Auth state will be updated by listeners
      }
      
      if (firebaseError) {
        addDebugEvent(`Firebase sign up failed: ${firebaseError}`);
        logger.warn('Firebase sign up failed, trying Supabase', firebaseError);
        
        // If Firebase fails, try Supabase
        const { user: supabaseUser, error: supabaseError } = await supabaseAuth.signUpWithEmail(email, password);
        
        if (supabaseError) {
          addDebugEvent(`Supabase sign up failed: ${supabaseError}`);
          throw new Error(supabaseError);
        }
        
        if (supabaseUser) {
          addDebugEvent('Supabase sign up successful');
          return null; // Auth state will be updated by listeners
        }
      }
      
      throw new Error('Sign up failed with both providers');
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      addDebugEvent(`Sign up error: ${errorInstance.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [addDebugEvent]);
  
  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<AuthUser | null> => {
    if (SUPABASE_ONLY_MODE) {
      setError(new Error('Google sign-in is not available in Supabase-only mode'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      addDebugEvent('Attempting sign in with Google');
      
      // Use Firebase for Google auth
      const { user: firebaseUser, error: firebaseError } = await firebaseAuthClient.signInWithGoogle();
      
      if (firebaseError) {
        addDebugEvent(`Google sign in failed: ${firebaseError}`);
        throw new Error(firebaseError);
      }
      
      if (firebaseUser) {
        // Get token to update Supabase state
        try {
          const token = await firebaseUser.getIdToken();
          
          // Call token exchange API
          await fetch('/api/auth/supabase-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseToken: token }),
          });
          
          addDebugEvent('Google sign in successful, exchanged token for Supabase');
        } catch (tokenError) {
          logger.error('Failed to exchange token after Google sign in:', tokenError);
          addDebugEvent('Google sign in successful, but token exchange failed');
        }
      }
      
      return null; // Auth state will be updated by listeners
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      addDebugEvent(`Google sign in error: ${errorInstance.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [addDebugEvent]);
  
  // Sign out from both providers
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      addDebugEvent('Signing out');
      
      // Sign out from both providers
      if (provider === 'firebase' || !provider) {
        const { error: firebaseError } = await firebaseAuthClient.signOut();
        if (firebaseError) {
          logger.warn('Firebase sign out error:', firebaseError);
        }
      }
      
      if (provider === 'supabase' || !provider) {
        const { error: supabaseError } = await supabaseAuth.signOut();
        if (supabaseError) {
          logger.warn('Supabase sign out error:', supabaseError);
        }
      }
      
      // Clear user state
      setUser(null);
      setProvider(null);
      
      // Redirect to home page if on a protected route
      if (pathname && (pathname.startsWith('/dashboard') || pathname.startsWith('/sops') || pathname.startsWith('/admin'))) {
        router.push('/');
      }
      
      addDebugEvent('Signed out successfully');
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      addDebugEvent(`Sign out error: ${errorInstance.message}`);
    } finally {
      setLoading(false);
    }
  }, [provider, pathname, router, addDebugEvent]);
  
  // Refresh the current session
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      addDebugEvent('Refreshing session...');

      // First check Firebase session if not in Supabase-only mode
      if (!SUPABASE_ONLY_MODE) {
        const firebaseUser = await firebaseAuthClient.getCurrentUser();
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken(true);
          
          // Sync Firebase token with Supabase
          const { data, error: supabaseError } = await supabase.auth.setSession({
            access_token: idToken,
            refresh_token: await firebaseUser.getIdTokenResult().then(result => result.token)
          });

          if (supabaseError) throw supabaseError;

          const session = data?.session;
          
          if (session) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!,
              photoURL: firebaseUser.photoURL,
              provider: 'firebase',
              role: session.user?.user_metadata?.role || 'viewer',
              firebaseUser
            });
            
            setProvider('firebase');
            addDebugEvent('Refreshed Firebase session and Supabase token');
            setDebugState(prev => ({
              ...prev,
              lastAuthCheck: new Date().toISOString(),
            }));
            return;
          }
        }
      }

      // Then check Supabase session
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      const session = data?.session;
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          displayName: session.user.user_metadata?.full_name || session.user.email!,
          photoURL: session.user.user_metadata?.avatar_url,
          provider: 'supabase',
          role: session.user.user_metadata?.role || 'viewer',
          supabaseUser: session.user
        });
        
        setProvider('supabase');
        addDebugEvent('Using Supabase session');
        setDebugState(prev => ({
          ...prev,
          lastAuthCheck: new Date().toISOString(),
        }));
        return;
      }

      // No valid session found
      setUser(null);
      setProvider(null);
      addDebugEvent('No active session found');
      
    } catch (error) {
      console.error('[Auth] Session refresh failed:', error);
      setUser(null);
      setProvider(null);
      setError(error instanceof Error ? error : new Error(String(error)));
      
      // Attempt to clear any stale session data
      try {
        await supabase.auth.signOut();
        if (!SUPABASE_ONLY_MODE) {
          await firebaseAuthClient.signOut();
        }
      } catch (cleanupError) {
        console.error('[Auth] Failed to clean up sessions:', cleanupError);
      }
    } finally {
      setLoading(false);
    }
  }, [addDebugEvent]);
  
  // Initialize authentication
  const initialAuthCheck = useCallback(async () => {
    try {
      setLoading(true);
      addDebugEvent('Performing initial auth check...');

      // Check for existing sessions in parallel
      const [firebaseUser, supabaseResponse] = await Promise.all([
        SUPABASE_ONLY_MODE ? null : firebaseAuthClient.getCurrentUser(),
        supabase.auth.getSession()
      ]);

      // Safely access the Supabase session
      const supabaseSession = supabaseResponse?.data?.session;

      if (firebaseUser && !SUPABASE_ONLY_MODE) {
        addDebugEvent('Found existing Firebase session');
        await refreshSession();
        return;
      }

      if (supabaseSession) {
        addDebugEvent('Found existing Supabase session');
        await refreshSession();
        return;
      }

      addDebugEvent('No existing sessions found');
      setUser(null);
      setProvider(null);

    } catch (error) {
      console.error('[Auth] Initial auth check failed:', error);
      setUser(null);
      setProvider(null);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [refreshSession, addDebugEvent]);

  // Initialize authentication
  useEffect(() => {
    let isMounted = true;
    let firebaseUnsubscribe: (() => void) | null = null;
    let supabaseUnsubscribe: (() => void) | null = null;
    
    addDebugEvent('Auth initialization started');
    
    // Initialize Supabase auth listener
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        addDebugEvent(`Supabase auth state changed: ${event}`);
        
        if (session?.user) {
          addDebugEvent(`Supabase user session updated: ${session.user.email}`);
          setUser({
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || null,
            photoURL: session.user.user_metadata?.avatar_url || null,
            role: (session.user.app_metadata?.role as UserRole) || 'viewer',
            provider: 'supabase',
            supabaseUser: session.user,
          });
          setProvider('supabase');
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          addDebugEvent('Supabase user signed out');
          setUser(null);
          setProvider(null);
        }
        
        // Refresh session state if needed
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          await refreshSession();
        }
      });
      
      // Store unsubscribe function
      supabaseUnsubscribe = data.subscription.unsubscribe;
    } catch (error) {
      logger.error('Error setting up Supabase auth listener:', error);
      addDebugEvent(`Supabase auth listener error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Initialize Firebase auth listener only if not in Supabase-only mode
    if (!SUPABASE_ONLY_MODE) {
      try {
        firebaseUnsubscribe = firebaseAuthClient.onAuthStateChanged(async (firebaseUser) => {
          if (!isMounted) return;
          
          if (firebaseUser) {
            addDebugEvent(`Firebase auth state changed: ${firebaseUser.email}`);
            
            try {
              // Get token result to check for custom claims (role)
              const tokenResult = await firebaseUser.getIdTokenResult();
              const role = (tokenResult.claims.role as UserRole) || 'viewer';
              
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role,
                provider: 'firebase',
                firebaseUser,
              });
              setProvider('firebase');
              
              // Exchange token for Supabase session
              try {
                const token = await firebaseUser.getIdToken();
                
                await fetch('/api/auth/supabase-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ firebaseToken: token }),
                });
                
                addDebugEvent('Exchanged Firebase token for Supabase session');
              } catch (tokenError) {
                logger.error('Failed to exchange token in auth listener:', tokenError);
              }
            } catch (error) {
              logger.error('Error processing Firebase user:', error);
              addDebugEvent(`Error processing Firebase user: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else if (provider === 'firebase') {
            addDebugEvent('Firebase user signed out');
            setUser(null);
            setProvider(null);
          }
          
          setLoading(false);
        });
      } catch (error) {
        logger.error('Error setting up Firebase auth listener:', error);
        addDebugEvent(`Firebase auth listener error: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    }

    // Perform initial auth check
    initialAuthCheck();

    // Clean up
    return () => {
      isMounted = false;
      if (firebaseUnsubscribe) firebaseUnsubscribe();
      if (supabaseUnsubscribe) supabaseUnsubscribe();
      addDebugEvent('Auth listeners cleaned up');
    };
  }, [addDebugEvent, initialAuthCheck, provider, refreshSession, user?.firebaseUser]);
  
  // Context value
  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshSession,
    provider,
    setError,
    debug: debugState,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth hook
export const useAuth = () => useContext(AuthContext); 