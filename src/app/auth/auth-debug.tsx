'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logger } from '@/utils/logger';

export default function AuthDebugPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [localStorageItems, setLocalStorageItems] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check local storage for auth-related items
    if (typeof window !== 'undefined') {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('pkce') || key.includes('code'))) {
          items[key] = localStorage.getItem(key) || '';
        }
      }
      setLocalStorageItems(items);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setStatus('loading');
      setMessage('Initializing Google Sign-In...');
      
      // Clear any existing auth data
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase')) {
          items[`${key} (before)`] = localStorage.getItem(key) || '';
        }
      }
      setDebugInfo(prev => ({ ...prev, authItemsBefore: items }));
      
      // Initialize the Supabase client
      const supabase = createClient();
      setMessage('Supabase client initialized');
      
      // Start the OAuth process
      setMessage('Starting Google OAuth sign-in...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      setStatus('success');
      setMessage('OAuth sign-in initiated. Redirecting to Google...');
      
      // Log the URL
      setDebugInfo(prev => ({ 
        ...prev, 
        oauthUrl: data?.url,
        provider: 'google',
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      logger.error('Google sign-in error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error during sign-in');
      setDebugInfo(prev => ({ 
        ...prev, 
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
      }));
    }
  };

  const clearAuthData = () => {
    try {
      // Clear all Supabase-related items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('pkce') || key.includes('code')) {
          localStorage.removeItem(key);
          logger.debug(`Removed: ${key}`);
        }
      });
      
      // Update the state
      setLocalStorageItems({});
      setMessage('Auth data cleared from localStorage');
      
    } catch (error) {
      logger.error('Error clearing auth data:', error);
      setMessage(`Error clearing auth data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-2xl font-bold mb-2">Auth Debug Tool</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Diagnose authentication flow issues
          </p>
        </header>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Test Authentication Flow</h2>
          
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={status === 'loading'}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Working...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Test Google Sign In
                </>
              )}
            </button>
            
            <button
              onClick={clearAuthData}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow"
            >
              Clear Auth Data
            </button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              status === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              status === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {message}
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">localStorage Auth Items</h2>
          
          {Object.keys(localStorageItems).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-4">Key</th>
                    <th className="text-left py-2 px-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(localStorageItems).map(([key, value]) => (
                    <tr key={key} className="border-b dark:border-gray-700">
                      <td className="py-2 px-4">{key}</td>
                      <td className="py-2 px-4 font-mono text-xs">{
                        value.length > 50 ? `${value.substring(0, 50)}...` : value
                      }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No auth-related items in localStorage</p>
          )}
        </div>
        
        {Object.keys(debugInfo).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 