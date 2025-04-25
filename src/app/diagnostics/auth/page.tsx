'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-provider';
import { createClient } from '@/utils/supabase/client';
import { auth as firebaseAuth } from '@/utils/firebase-auth-client';
import { Auth, User } from 'firebase/auth';

/**
 * Auth Diagnostics Page
 * This page helps diagnose authentication issues
 */
export default function AuthDiagnosticsPage() {
  const { user, provider, debug, loading, refreshSession } = useAuth();
  const [cookies, setCookies] = useState<{[key: string]: string}>({});
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...');
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Checking...');
  const [envVars, setEnvVars] = useState<{[key: string]: boolean}>({});
  
  // Get all cookies
  useEffect(() => {
    const cookieObj: {[key: string]: string} = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookieObj[name] = value;
    });
    setCookies(cookieObj);
    
    // Check environment variables
    setEnvVars({
      // Supabase
      'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      
      // Firebase
      'NEXT_PUBLIC_FIREBASE_API_KEY': !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID': !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    
    // Check Supabase status
    const checkSupabase = async () => {
      try {
        const supabase = createClient();
        if (!supabase || !supabase.auth) {
          setSupabaseStatus('Error: Supabase client not properly initialized');
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setSupabaseStatus(`Error: ${error.message}`);
        } else if (data.session) {
          setSupabaseStatus(`Active session for ${data.session.user.email}`);
        } else {
          setSupabaseStatus('No active session');
        }
      } catch (err) {
        setSupabaseStatus(`Client error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Check Firebase status
    const checkFirebase = () => {
      try {
        // Make sure firebaseAuth is an Auth instance
        const auth = firebaseAuth as Auth;
        
        // Check if Firebase Auth is properly initialized
        if (!auth || typeof auth.currentUser === 'undefined') {
          setFirebaseStatus('Error: Firebase auth not properly initialized');
          return;
        }

        const user = auth.currentUser as User | null;
        if (user) {
          setFirebaseStatus(`Active session for ${user.email}`);
        } else {
          setFirebaseStatus('No active session');
        }
      } catch (err) {
        setFirebaseStatus(`Client error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    checkSupabase();
    checkFirebase();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Diagnostics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Context Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Auth Context Status</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Loading:</span> {loading ? 'True' : 'False'}</p>
            <p><span className="font-medium">Authenticated:</span> {user ? 'Yes' : 'No'}</p>
            <p><span className="font-medium">Provider:</span> {provider || 'None'}</p>
            
            {user && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">User Info</h3>
                <p><span className="font-medium">ID:</span> {user.id}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">Role:</span> {user.role}</p>
              </div>
            )}
            
            <div className="mt-4">
              <button 
                onClick={() => refreshSession()} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Refresh Session
              </button>
            </div>
          </div>
        </div>
        
        {/* Auth Provider Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Auth Provider Status</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Supabase:</span> {supabaseStatus}</p>
            <p><span className="font-medium">Firebase:</span> {firebaseStatus}</p>
          </div>
        </div>
        
        {/* Cookie Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Cookies</h2>
          <div className="space-y-2">
            {Object.keys(cookies).length > 0 ? (
              <>
                {Object.entries(cookies).map(([name, value]) => (
                  <p key={name}><span className="font-medium">{name}:</span> {value ? 'Present' : 'Empty'}</p>
                ))}
              </>
            ) : (
              <p>No cookies found</p>
            )}
          </div>
        </div>
        
        {/* Environment Variables */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([name, exists]) => (
              <p key={name}>
                <span className="font-medium">{name}:</span> 
                {exists ? (
                  <span className="text-green-600 dark:text-green-400">Set</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">Missing</span>
                )}
              </p>
            ))}
          </div>
        </div>
        
        {/* Debug Events */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 col-span-1 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Auth Debug Events</h2>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60">
            {debug && debug.authEvents && debug.authEvents.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {debug.authEvents.map((event, i) => (
                  <li key={i} className="font-mono text-sm">{event}</li>
                ))}
              </ul>
            ) : (
              <p>No events recorded</p>
            )}
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Last auth check: {debug?.lastAuthCheck || 'None'}
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Ensure environment variables are correctly set</li>
          <li>Check console logs for authentication errors</li>
          <li>Verify that cookies are being properly set</li>
          <li>Try logging out and back in</li>
          <li>Clear browser cache and cookies if persistent issues occur</li>
        </ul>
      </div>
    </div>
  );
} 