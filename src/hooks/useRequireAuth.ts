'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { useAuthContext, AuthUser } from '@/providers/AuthProvider';

/**
 * Custom hook to enforce authentication in client components
 * Redirects to login if not authenticated
 * 
 * @param redirectTo Optional path to redirect to after login (defaults to current page)
 * @returns Object containing authentication state
 */
interface UseRequireAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  getToken: () => Promise<string | null>;
}

export function useRequireAuth(redirectTo = '/auth/signin'): UseRequireAuthReturn {
  const { user, isLoading, isAuthenticated, getToken } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If auth is finished loading and there's no user, redirect to login
    if (!isLoading && !user) {
      const currentPath = encodeURIComponent(window.location.pathname);
      router.push(`${redirectTo}?redirectTo=${currentPath}`);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading, isAuthenticated, getToken };
} 