'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/utils/auth';

interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * React hook to check if the current user is an admin
 * Uses the /api/auth/check-admin endpoint to verify admin status
 */
export function useIsAdmin(): UseIsAdminResult {
  const { session, isLoading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const checkAdminStatus = useCallback(async () => {
    if (sessionLoading) return;
    
    // If no session, user is not an admin
    if (!session) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use POST method which checks cookies directly for better security
      const response = await fetch('/api/auth/check-admin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Admin check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error checking admin status'));
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [session, sessionLoading]);
  
  // Check admin status when session changes
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);
  
  // Return admin status, loading state, error, and refetch function
  return {
    isAdmin,
    isLoading: isLoading || sessionLoading,
    error,
    refetch: checkAdminStatus,
  };
} 