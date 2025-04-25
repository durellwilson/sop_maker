'use client';

import { supabase } from '@/lib/supabase';
import { auth } from '@/utils/firebase';

/**
 * Utility function to check authentication status with both Firebase and Supabase
 * This can be used for debugging authentication issues
 */
export const checkAuthStatus = async () => {
  const results = {
    firebase: {
      currentUser: null as any,
      error: null as string | null
    },
    supabase: {
      session: null as any,
      user: null as any,
      error: null as string | null
    },
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing',
      useDevUser: process.env.NEXT_PUBLIC_USE_DEV_USER
    }
  };

  // Check Firebase auth
  try {
    const currentUser = auth.currentUser;
    results.firebase.currentUser = currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      displayName: currentUser.displayName,
      isAnonymous: currentUser.isAnonymous
    } : null;
  } catch (err) {
    results.firebase.error = err instanceof Error ? err.message : String(err);
  }

  // Check Supabase auth
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      results.supabase.error = error.message;
    } else {
      results.supabase.session = session;
      results.supabase.user = session?.user || null;
    }
  } catch (err) {
    results.supabase.error = err instanceof Error ? err.message : String(err);
  }

  return results;
};

/**
 * Check if both Firebase and Supabase authentication are working correctly
 */
export const isAuthWorking = async () => {
  const status = await checkAuthStatus();
  
  const firebaseWorking = !!status.firebase.currentUser || status.firebase.error === null;
  const supabaseWorking = !!status.supabase.session || status.supabase.error === null;
  
  return {
    firebase: firebaseWorking,
    supabase: supabaseWorking,
    overall: firebaseWorking && supabaseWorking
  };
}; 