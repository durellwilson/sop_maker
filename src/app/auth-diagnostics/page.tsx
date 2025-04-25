'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/utils/supabase/client';

export default function AuthDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<{
    environment: Record<string, any>;
    connectivity: Record<string, any>;
    auth: Record<string, any>;
  }>({
    environment: {},
    connectivity: {},
    auth: {},
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Run diagnostics
  const runDiagnostics = async () => {
    setIsRunning(true);
    setIsComplete(false);
    
    try {
      // Check environment
      const environment = {
        supabaseConfigured: isSupabaseConfigured(),
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };
      
      setDiagnostics(prev => ({ ...prev, environment }));
      
      // Check connectivity
      const connectivity = { status: 'checking' };
      setDiagnostics(prev => ({ ...prev, connectivity }));
      
      try {
        const pingResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/ping`);
        const pingStatus = pingResponse.ok;
        
        connectivity.status = pingStatus ? 'online' : 'error';
        connectivity.statusCode = pingResponse.status;
        connectivity.details = pingStatus ? 'Supabase API is accessible' : 'Cannot reach Supabase API';
      } catch (error) {
        connectivity.status = 'error';
        connectivity.error = error instanceof Error ? error.message : String(error);
      }
      
      setDiagnostics(prev => ({ ...prev, connectivity }));
      
      // Check auth endpoint
      const auth = { status: 'checking' };
      setDiagnostics(prev => ({ ...prev, auth }));
      
      try {
        const response = await fetch('/api/auth/test-session');
        auth.status = response.ok ? 'success' : 'error';
        auth.statusCode = response.status;
        
        if (response.ok) {
          const data = await response.json();
          auth.response = data;
          auth.details = data.authenticated
            ? 'Auth API endpoint is working and can access session'
            : 'Auth API endpoint is working but no session found';
        } else {
          auth.details = `Auth API endpoint returned error: ${response.status}`;
        }
      } catch (error) {
        auth.status = 'error';
        auth.error = error instanceof Error ? error.message : String(error);
      }
      
      setDiagnostics(prev => ({ ...prev, auth }));
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsRunning(false);
      setIsComplete(true);
    }
  };
  
  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);
  
  // Helper to render status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      checking: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      success: 'bg-green-100 text-green-800 border-green-300',
      online: 'bg-green-100 text-green-800 border-green-300',
      error: 'bg-red-100 text-red-800 border-red-300',
      unknown: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    
    const color = colors[status as keyof typeof colors] || colors.unknown;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Authentication Diagnostics</h1>
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
        
        <div className="grid gap-6">
          {/* Environment Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment Configuration</h2>
            
            {Object.keys(diagnostics.environment).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Supabase Configuration</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span>Configured:</span>
                      <StatusBadge status={diagnostics.environment.supabaseConfigured ? 'success' : 'error'} />
                    </li>
                    <li className="flex justify-between">
                      <span>URL:</span>
                      <StatusBadge status={diagnostics.environment.hasSupabaseUrl ? 'success' : 'error'} />
                    </li>
                    <li className="flex justify-between">
                      <span>API Key:</span>
                      <StatusBadge status={diagnostics.environment.hasSupabaseKey ? 'success' : 'error'} />
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Environment</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span>Node Environment:</span>
                      <span className="font-mono text-sm">{diagnostics.environment.nodeEnv}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Timestamp:</span>
                      <span className="font-mono text-xs">{diagnostics.environment.timestamp}</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="ml-2">Checking environment...</span>
              </div>
            )}
          </div>
          
          {/* Connectivity Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold">API Connectivity</h2>
              {diagnostics.connectivity.status && (
                <div className="ml-3">
                  <StatusBadge status={diagnostics.connectivity.status} />
                </div>
              )}
            </div>
            
            {diagnostics.connectivity.status ? (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="mb-2">{diagnostics.connectivity.details || 'Checking connectivity...'}</p>
                
                {diagnostics.connectivity.error && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded">
                    <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                      {diagnostics.connectivity.error}
                    </p>
                  </div>
                )}
                
                {diagnostics.connectivity.status === 'online' && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Connection to Supabase API is working
                  </p>
                )}
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="ml-2">Testing connectivity...</span>
              </div>
            )}
          </div>
          
          {/* Auth API Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold">Auth API Status</h2>
              {diagnostics.auth.status && (
                <div className="ml-3">
                  <StatusBadge status={diagnostics.auth.status} />
                </div>
              )}
            </div>
            
            {diagnostics.auth.status ? (
              <div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                  <p>{diagnostics.auth.details || 'Checking authentication API...'}</p>
                  
                  {diagnostics.auth.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded">
                      <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                        {diagnostics.auth.error}
                      </p>
                    </div>
                  )}
                </div>
                
                {diagnostics.auth.response && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">API Response:</h3>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(diagnostics.auth.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="ml-2">Testing auth API...</span>
              </div>
            )}
          </div>
          
          {/* Summary Section */}
          {isComplete && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Auth System Status</h3>
                
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                      diagnostics.environment.supabaseConfigured ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-xs">
                        {diagnostics.environment.supabaseConfigured ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Environment Configuration</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {diagnostics.environment.supabaseConfigured
                          ? 'Environment variables properly configured'
                          : 'Missing required environment variables'
                        }
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex items-start">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                      diagnostics.connectivity.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-xs">
                        {diagnostics.connectivity.status === 'online' ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">API Connectivity</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {diagnostics.connectivity.status === 'online'
                          ? 'Successfully connected to Supabase API'
                          : 'Failed to connect to Supabase API'
                        }
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex items-start">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                      diagnostics.auth.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-xs">
                        {diagnostics.auth.status === 'success' ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Auth System</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {diagnostics.auth.status === 'success'
                          ? 'Auth API endpoints working properly'
                          : 'Issues with Auth API endpoints'
                        }
                      </p>
                    </div>
                  </li>
                </ul>
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-2">Next Steps</h3>
                  {(diagnostics.environment.supabaseConfigured && 
                   diagnostics.connectivity.status === 'online' && 
                   diagnostics.auth.status === 'success') ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-900">
                      <p className="text-green-800 dark:text-green-200">
                        ✅ Authentication system appears to be properly configured and working.
                        You can now test authentication flows using the <a href="/auth-test" className="underline">Auth Test</a> page.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-900">
                      <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                        ⚠️ Some issues were detected with your authentication setup:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {!diagnostics.environment.supabaseConfigured && (
                          <li>Missing or invalid environment variables for Supabase configuration</li>
                        )}
                        {diagnostics.connectivity.status !== 'online' && (
                          <li>Unable to connect to Supabase API - check network connectivity and API URL</li>
                        )}
                        {diagnostics.auth.status !== 'success' && (
                          <li>Auth API endpoints returning errors - check server logs for details</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 