'use client';

import { FormEvent, useState, useEffect, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/utils/supabase/client';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Provider } from '@supabase/supabase-js';

// For now, create a simple Google button since the import is failing
const GoogleAuthButton = ({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) => (
  <Button
    type="button"
    className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
    onClick={onClick}
    disabled={isLoading}
  >
    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
      </g>
    </svg>
    {isLoading ? 'Signing in...' : 'Continue with Google'}
  </Button>
);

// Define the OAuth options type to match the Supabase client's expectations
type OAuthProviderOptions = {
  redirectTo?: string;
  scopes?: string;
  queryParams?: Record<string, string>;
  skipBrowserRedirect?: boolean;
  // Add PKCE-specific options that might be missing in the type definitions
  flowType?: 'implicit' | 'pkce';
};

/**
 * Sign in page component for authentication
 */
export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [clientSideLog, setClientSideLog] = useState<string[]>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for both redirect and redirectTo parameters for compatibility
  const redirectPath = 
    searchParams.get('redirectTo') || 
    searchParams.get('redirect') || 
    '/dashboard';
    
  const errorParam = searchParams.get('error');
  
  // Add to client-side log
  const addLog = (message: string) => {
    console.log(`Auth Page: ${message}`);
    setClientSideLog(prev => [...prev.slice(-19), message]);
  };
  
  // Log which redirect parameter was used
  useEffect(() => {
    if (searchParams.get('redirectTo')) {
      addLog(`Using redirectTo parameter: ${searchParams.get('redirectTo')}`);
    } else if (searchParams.get('redirect')) {
      addLog(`Using redirect parameter: ${searchParams.get('redirect')}`);
    } else {
      addLog('No redirect parameter found, using default: /dashboard');
    }
  }, [searchParams]);
  
  // Check if user is already authenticated
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          addLog(`Session check error: ${error.message}`);
          return;
        }
        
        if (data?.session) {
          addLog('User is already authenticated. Redirecting...');
          router.push(redirectPath);
        }
      } catch (err) {
        addLog(`Error checking session: ${(err as Error).message}`);
      }
    }
    
    checkSession();
  }, [redirectPath, router]);
  
  // Handle error parameter from redirects
  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'auth_callback_failed') {
        setError('Authentication failed. Please try again.');
      } else if (errorParam === 'missing_code') {
        setError('Authentication code was missing or invalid. Please try signing in again.');
      } else if (errorParam === 'auth_exchange_failed') {
        setError('Failed to complete authentication. Please try again.');
      }
      
      addLog(`URL error parameter: ${errorParam}`);
    }
    
    addLog('Sign-in page initialized');
    
    // Debug key combination
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+D to toggle debug
      if (e.ctrlKey && e.altKey && e.key === 'd') {
        setDebugVisible(prev => !prev);
        addLog('Debug visibility toggled');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [errorParam]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    addLog(`Login attempt with email: ${email}`);
    
    try {
      const supabase = createBrowserClient();
      
      addLog('Supabase client created');
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        addLog(`Login error: ${error.message}`);
        throw error;
      }
      
      addLog('Login successful, redirecting...');
      
      // Redirect on successful login
      addLog(`Redirecting to ${redirectPath}`);
      router.push(redirectPath);
    } catch (err) {
      console.error('Login error:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred during login. Please try again.';
        
      setError(errorMessage);
      addLog(`Login failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    addLog('Initiating Google sign-in via Supabase');
    
    try {
      // Generate a new PKCE code verifier
      const generateCodeVerifier = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(64);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < 64; i++) {
          result += chars.charAt(randomValues[i] % chars.length);
        }
        return result;
      };

      // Clear all auth-related data to ensure clean state
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
      
      addLog('Previous auth data cleared for clean PKCE flow');
      
      // Generate and save new code verifier
      const codeVerifier = generateCodeVerifier();
      localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
      localStorage.setItem('supabase.auth.pkce_method', 'S256');
      localStorage.setItem('supabase.auth.flow_type', 'pkce');
      
      addLog(`New code verifier generated: ${codeVerifier.substring(0, 5)}...`);
      
      const supabase = createBrowserClient();
      
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client");
      }
      
      addLog('Supabase client created for OAuth');
      
      // Clear any previous session
      await supabase.auth.signOut({ scope: 'local' });
      addLog('Previous session cleared');
      
      // Build redirect URL for after authentication
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const finalRedirectUrl = redirectPath 
        ? `${redirectUrl}?redirectTo=${encodeURIComponent(redirectPath)}` 
        : redirectUrl;
        
      addLog(`OAuth redirect URL: ${finalRedirectUrl}`);
      
      // Verify the code verifier is saved before proceeding
      const storedCodeVerifier = localStorage.getItem('supabase.auth.code_verifier');
      if (!storedCodeVerifier) {
        throw new Error('Failed to save PKCE code verifier');
      }
      
      addLog(`PKCE flow state confirmed - Code verifier length: ${storedCodeVerifier.length}`);
      
      // Sign in with Google via Supabase OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google' as Provider,
        options: {
          redirectTo: finalRedirectUrl,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          },
          flowType: 'pkce',
        } as OAuthProviderOptions,
      });
      
      if (error) {
        addLog(`OAuth error: ${error.message}`);
        throw error;
      }
      
      if (!data || !data.url) {
        addLog('OAuth initiated but no URL returned for redirect');
        throw new Error('No redirect URL was provided by the authentication service');
      }
      
      // Double-check that code verifier is still in localStorage
      const hasCodeVerifier = Boolean(localStorage.getItem('supabase.auth.code_verifier'));
      addLog(`Final check - Code verifier ${hasCodeVerifier ? 'is' : 'is NOT'} in localStorage`);
      
      // Log the URL we're redirecting to (without sensitive info)
      const redirectURL = new URL(data.url);
      addLog(`Redirecting to: ${redirectURL.origin}${redirectURL.pathname}`);
      
      // Let the user know we're redirecting
      addLog('OAuth initiated, redirecting to authentication provider...');
      
      // Direct the browser to the authorization URL
      window.location.href = data.url;
    } catch (error) {
      addLog(`Sign-in error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
      setError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred during sign-in. Please try again.'
      );
    }
  };
  
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-sm mb-6">
            {error}
          </div>
        )}
        
        {/* Social login button - use GoogleAuthButton component */}
        <div className="space-y-3 mb-6">
          <GoogleAuthButton
            onClick={handleGoogleSignIn}
            isLoading={isLoading}
          />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with email</span>
          </div>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">
                Password
              </Label>
              <div className="text-sm">
                <Link href="/auth/reset-password" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-semibold leading-6 text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Sign up
          </Link>
        </p>
        
        {/* Debug info toggle only shown with keyboard shortcut Ctrl+Alt+D */}
        {debugVisible && (
          <div className="mt-8 text-xs text-gray-500 p-3 border border-gray-200 rounded-md">
            <h3 className="font-bold mb-2">Debug Log</h3>
            <div className="max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {clientSideLog.map((log, i) => (
                <div key={i} className="font-mono truncate">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 