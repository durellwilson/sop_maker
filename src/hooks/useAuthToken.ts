'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Custom hook to consistently get authentication tokens for API calls
 * Handles automatic retries and error states
 */
export function useAuthToken() {
  const { session, getToken, initialized } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch token on component mount and when session changes
  useEffect(() => {
    if (!initialized) return;

    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to get token from session first (faster)
        if (session?.access_token) {
          setToken(session.access_token);
          return;
        }
        
        // If no session token available, use getToken which handles fallbacks
        const newToken = await getToken();
        setToken(newToken);
      } catch (err) {
        console.error('Error fetching auth token:', err);
        setError(err instanceof Error ? err : new Error('Failed to get authentication token'));
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [session, getToken, initialized]);

  // Function to force refresh the token
  const refreshToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newToken = await getToken();
      setToken(newToken);
      return newToken;
    } catch (err) {
      console.error('Error refreshing auth token:', err);
      const newError = err instanceof Error ? err : new Error('Failed to refresh authentication token');
      setError(newError);
      throw newError;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  return { token, loading, error, refreshToken };
}

export default useAuthToken; 