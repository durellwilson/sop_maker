'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Test page for authentication
 * This page displays authentication status and debug information
 */
export default function AuthTestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  
  const auth = useAuth();
  
  // Add log message with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  // Test email sign in
  const testEmailSignIn = async () => {
    if (!email || !password) {
      addLog('Error: Email and password are required');
      return;
    }
    
    setTestStatus('running');
    addLog(`Testing email sign in with ${email}...`);
    
    try {
      await auth.signInWithEmail(email, password);
      addLog('Sign in successful!');
      
      // Check if we have a user object
      if (auth.user) {
        addLog(`Authenticated as: ${auth.user.email}`);
        setTestStatus('success');
      } else {
        addLog('Warning: Sign in completed but no user object available');
        setTestStatus('failed');
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setTestStatus('failed');
    }
  };
  
  // Test Google sign in
  const testGoogleSignIn = async () => {
    setTestStatus('running');
    addLog('Testing Google sign in...');
    
    try {
      await auth.signInWithGoogle(`${window.location.origin}/auth/callback?redirectTo=/auth-test`);
      addLog('Redirecting to Google...');
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setTestStatus('failed');
    }
  };
  
  // Test API authentication
  const testApiAuth = async () => {
    setApiTestStatus('running');
    addLog('Testing API authentication...');
    
    try {
      const response = await fetch('/api/auth/test-session');
      const data = await response.json();
      
      setApiTestResult(data);
      
      if (data.authenticated) {
        addLog(`API authentication successful: User ID ${data.user.id}`);
        setApiTestStatus('success');
      } else {
        addLog(`API authentication failed: ${data.error || 'Not authenticated'}`);
        setApiTestStatus('failed');
      }
    } catch (error) {
      addLog(`API test error: ${error instanceof Error ? error.message : String(error)}`);
      setApiTestStatus('failed');
      setApiTestResult({ error: String(error) });
    }
  };
  
  // Check if user is already logged in
  useEffect(() => {
    if (auth.isAuthenticated) {
      addLog(`Already logged in as: ${auth.user?.email}`);
      setTestStatus('success');
    } else if (auth.error) {
      addLog(`Auth error: ${auth.error}`);
    }
  }, [auth.isAuthenticated, auth.user, auth.error]);
  
  // Render test status icon
  const StatusIcon = ({ status }: { status: 'idle' | 'running' | 'success' | 'failed' }) => {
    switch (status) {
      case 'running':
        return <div className="h-4 w-4 rounded-full bg-yellow-500 animate-pulse" />;
      case 'success':
        return <div className="h-4 w-4 rounded-full bg-green-500" />;
      case 'failed':
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Authentication Test</h1>
          <div className="flex items-center space-x-2">
            <span>Status:</span>
            <StatusIcon status={testStatus} />
          </div>
        </div>
        
        {auth.isAuthenticated ? (
          <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
            <AlertDescription className="text-green-800 dark:text-green-300">
              ✅ Successfully authenticated as {auth.user?.email}
            </AlertDescription>
          </Alert>
        ) : null}
        
        {auth.error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{auth.error}</AlertDescription>
          </Alert>
        ) : null}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Email Sign In Test</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  disabled={auth.isLoading}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={auth.isLoading}
                />
              </div>
              <Button 
                onClick={testEmailSignIn} 
                disabled={auth.isLoading || !email || !password}
                className="w-full"
              >
                {auth.isLoading ? 'Testing...' : 'Test Email Sign In'}
              </Button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">OAuth Sign In Test</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click below to test Google sign in. You'll be redirected to Google's authentication page.
              </p>
              <Button 
                onClick={testGoogleSignIn} 
                disabled={auth.isLoading}
                className="w-full"
                variant="outline"
              >
                Test Google Sign In
              </Button>
              
              <div className="pt-4">
                <h3 className="font-medium mb-2">Debugging Info</h3>
                <div className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs">
                  <pre>Auth State: {JSON.stringify({
                    isAuthenticated: auth.isAuthenticated,
                    isLoading: auth.isLoading,
                    hasError: !!auth.error
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <span className="mr-2">API Auth Test</span>
              <StatusIcon status={apiTestStatus} />
            </h2>
            <Button 
              onClick={testApiAuth} 
              disabled={apiTestStatus === 'running'}
              size="sm"
            >
              {apiTestStatus === 'running' ? 'Testing...' : 'Test API Auth'}
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This test verifies that server-side authentication is working properly.
            It will call an API endpoint that accesses the Supabase session from cookies.
          </p>
          
          {apiTestResult && (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto text-xs font-mono">
              <pre>{JSON.stringify(apiTestResult, null, 2)}</pre>
            </div>
          )}
        </div>
        
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Authentication Logs</h2>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              Clear Logs
            </Button>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 h-60 overflow-y-auto font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  {log}
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No logs yet. Run a test to see results.</p>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              addLog('Signing out...');
              await auth.signOut();
              addLog('Signed out successfully');
              setTestStatus('idle');
              setApiTestStatus('idle');
              setApiTestResult(null);
            }}
            disabled={!auth.isAuthenticated || auth.isLoading}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
} 