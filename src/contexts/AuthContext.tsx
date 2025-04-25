'use client';

import React, { createContext, useContext } from 'react';
import { useAuthContext as useNewAuthContext } from '@/providers/AuthProvider';

// Legacy compatibility types
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

// Legacy auth context type
interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  isAuthReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create legacy context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isAuthReady: false,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

// Legacy hook to use auth context
// This forwards to the new auth context provider
export function useAuth() {
  const legacyContext = useContext(AuthContext);
  const newContext = useNewAuthContext();

  // If legacy context has a proper implementation (not just defaults),
  // use that, otherwise adapt the new context to the legacy format
  if (legacyContext.isAuthReady) {
    return legacyContext;
  }

  // Adapt the new auth context to the legacy format
  const adaptedContext: AuthContextType = {
    loading: newContext.loading,
    isAuthReady: true,
    currentUser: newContext.firebaseUser as FirebaseUser | null,
    signInWithEmail: async (email, password) => {
      await newContext.signInWithSupabase(email, password);
    },
    signUpWithEmail: async (email, password) => {
      await newContext.signUpWithEmail(email, password, '');
    },
    signInWithGoogle: async () => {
      await newContext.signInWithGoogle();
    },
    signOut: async () => {
      await newContext.signOut();
    }
  };

  return adaptedContext;
}

// Export the AuthProvider component for compatibility
// This is a no-op and should be replaced with the real AuthProvider in app/layout.tsx
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // This just renders children since the real provider is at the root
  return <>{children}</>;
};

// Default export for compatibility
export default AuthProvider; 