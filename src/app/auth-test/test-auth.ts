'use client';

import { useAuth } from '@/context/auth-provider';

/**
 * A simple utility to test the auth provider
 * This can be called from browser console to diagnose authentication issues
 */
export function testAuth() {
  const auth = useAuth();
  
  console.group('Auth Provider Test');
  console.log('User:', auth.user);
  console.log('Loading:', auth.loading);
  console.log('Error:', auth.error);
  console.log('Provider:', auth.provider);
  console.log('Debug:', auth.debug);
  console.groupEnd();
  
  return {
    isAuthenticated: !!auth.user,
    provider: auth.provider,
    userId: auth.user?.id,
    userEmail: auth.user?.email,
    userRole: auth.user?.role,
    error: auth.error?.message,
    loading: auth.loading,
    events: auth.debug.authEvents,
  };
}

/**
 * Export auth provider for direct testing in components
 */
export function getAuthProvider() {
  return useAuth();
} 