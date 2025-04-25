'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkAuthStatus } from '@/utils/auth-checker';

export default function AuthDebugger() {
  const { currentUser, loading } = useAuth();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runCheck = async () => {
    setIsChecking(true);
    try {
      // Check client-side auth status
      const clientStatus = await checkAuthStatus();
      setAuthStatus(clientStatus);

      // Check server-side auth status
      const apiResponse = await fetch('/api/auth/check');
      const apiData = await apiResponse.json();
      setApiStatus(apiData);
    } catch (error) {
      console.error('Error running auth check:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Run a check when the component mounts
  useEffect(() => {
    if (!loading) {
      runCheck();
    }
  }, [loading]);

  if (loading) {
    return <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">Loading authentication status...</div>;
  }

  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Authentication Debugger</h2>
        <button 
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={runCheck}
          disabled={isChecking}
        >
          {isChecking ? 'Checking...' : 'Run Check'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-md font-medium mb-2">Client Status</h3>
          <div className="p-3 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
            {authStatus ? (
              <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(authStatus, null, 2)}</pre>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-2">Server Status</h3>
          <div className="p-3 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
            {apiStatus ? (
              <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(apiStatus, null, 2)}</pre>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="text-md font-medium mb-2">Quick Status</h3>
        <div className="p-3 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="mr-2">Firebase Auth:</span>
              <span className={`px-2 py-1 text-xs rounded ${authStatus?.firebase?.currentUser ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                {authStatus?.firebase?.currentUser ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">Supabase Auth:</span>
              <span className={`px-2 py-1 text-xs rounded ${authStatus?.supabase?.session ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                {authStatus?.supabase?.session ? 'Session Active' : 'No Session'}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">Dev User Mode:</span>
              <span className={`px-2 py-1 text-xs rounded ${authStatus?.environment?.useDevUser === 'true' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}>
                {authStatus?.environment?.useDevUser === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 