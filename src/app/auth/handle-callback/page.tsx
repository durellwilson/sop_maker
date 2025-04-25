'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Client-side handler for Supabase auth callback
 * This component handles authentication redirects from Supabase
 * and exchanges the code for a session
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to add logs
  const addLog = (message: string) => {
    console.log(`[Auth Callback]: ${message}`);
    setLogs(prev => [...prev, `${new Date().toISOString().substring(11, 19)} - ${message}`]);
  };

  useEffect(() => {
    const handleCallback = async () => {
      addLog('Auth callback handler started');
      
      // Get the code from the URL
      const code = searchParams.get('code');
      const redirectTo = searchParams.get('redirectTo') || '/dashboard';

      if (!code) {
        addLog('Error: No code found in URL parameters');
        setStatus('error');
        setError('No authentication code was provided. Please try signing in again.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/auth/signin?error=no_code_found');
        }, 3000);
        
        return;
      }

      addLog(`Auth code found in URL, initiating code exchange`);
      
      try {
        // Check if code verifier exists
        const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        const pkceMethod = localStorage.getItem('supabase.auth.pkce_method');
        const flowType = localStorage.getItem('supabase.auth.flow_type');
        
        addLog(`PKCE state - Code verifier: ${Boolean(codeVerifier)}, PKCE method: ${pkceMethod || 'not set'}, Flow type: ${flowType || 'not set'}`);
        
        if (!codeVerifier) {
          addLog('Error: Missing code verifier in localStorage');
          
          // Log all localStorage keys for debugging
          addLog('localStorage keys: ' + Object.keys(localStorage).filter(k => k.startsWith('supabase')).join(', '));
          
          setStatus('error');
          setError('Authentication failed: Missing security verification code. Please clear your browser cache and try again.');
          
          // Redirect to login after a delay
          setTimeout(() => {
            router.push('/auth/signin?error=missing_code_verifier');
          }, 3000);
          
          return;
        }

        // Initialize Supabase client
        const supabase = createBrowserClient();
        
        if (!supabase) {
          throw new Error('Failed to initialize Supabase client');
        }
        
        addLog('Supabase client initialized for code exchange');

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          addLog(`Code exchange error: ${exchangeError.message}`);
          throw exchangeError;
        }
        
        if (!data || !data.session) {
          addLog('Error: No session returned from code exchange');
          throw new Error('Authentication failed: No session was created');
        }

        // Success - log the user and redirect
        addLog(`Authentication successful for user: ${data.user?.email}`);
        setStatus('success');
        
        // Wait a moment to ensure the session is properly established
        setTimeout(() => {
          // Store user data in localStorage for quick access
          if (data.user) {
            localStorage.setItem('userEmail', data.user.email || '');
            localStorage.setItem('userId', data.user.id || '');
          }
          
          addLog(`Redirecting to: ${redirectTo}`);
          router.push(redirectTo);
        }, 1000);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`Authentication error: ${errorMessage}`);
        
        setStatus('error');
        setError(`Authentication failed: ${errorMessage}`);
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push(`/auth/signin?error=${encodeURIComponent(errorMessage)}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);
  
  // Render different UI based on status
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center mb-4">
          {status === 'loading' && 'Completing Sign In...'}
          {status === 'success' && 'Sign In Successful!'}
          {status === 'error' && 'Sign In Failed'}
        </h1>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Please wait while we complete your authentication...
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center text-gray-600 dark:text-gray-300">
            <p>You have been successfully authenticated.</p>
            <p className="mt-2">Redirecting you to your dashboard...</p>
          </div>
        )}
        
        {status === 'error' && error && (
          <div className="text-center text-red-500 dark:text-red-400">
            <p>{error}</p>
            <p className="mt-2">You'll be redirected to the sign-in page shortly.</p>
          </div>
        )}
        
        {/* Show debug logs in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto max-h-60">
            <h3 className="font-semibold mb-1">Debug Logs:</h3>
            <ul className="space-y-1">
              {logs.map((log, i) => (
                <li key={i}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 