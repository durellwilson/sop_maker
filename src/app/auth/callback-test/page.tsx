'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function CallbackTestPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking callback parameters...');
  const [details, setDetails] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<string[]>([]);
  
  const searchParams = useSearchParams();
  
  // Log function
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };
  
  useEffect(() => {
    async function processCallback() {
      try {
        addLog('Starting callback test');
        
        // Get URL parameters
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setMessage('No code parameter found in URL');
          addLog('Error: No code parameter found');
          
          // Collect parameters for debugging
          const params: Record<string, string> = {};
          searchParams.forEach((value, key) => {
            params[key] = value;
          });
          setDetails({ params });
          return;
        }
        
        addLog(`Found code parameter: ${code.substring(0, 5)}...`);
        
        // Try to initialize Supabase client
        let supabase;
        try {
          supabase = createClient();
          addLog('Supabase client initialized successfully');
        } catch (error) {
          addLog(`Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`);
          setStatus('error');
          setMessage('Failed to initialize Supabase client');
          setDetails({ error: error instanceof Error ? error.message : String(error) });
          return;
        }
        
        // Try to exchange the code for a session
        try {
          addLog('Exchanging code for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            addLog(`Code exchange error: ${error.message}`);
            setStatus('error');
            setMessage(`Failed to exchange code: ${error.message}`);
            setDetails({ error: error.message });
            return;
          }
          
          if (!data.session) {
            addLog('Code exchange completed but no session returned');
            setStatus('error');
            setMessage('No session returned after code exchange');
            return;
          }
          
          addLog('Successfully exchanged code for session');
          
          // Get final session to verify
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData?.session) {
            addLog(`Authenticated as: ${sessionData.session.user.email}`);
            setStatus('success');
            setMessage(`Successfully authenticated as ${sessionData.session.user.email}`);
            setDetails({ 
              user: {
                id: sessionData.session.user.id,
                email: sessionData.session.user.email,
                provider: sessionData.session.user.app_metadata?.provider
              }
            });
          } else {
            addLog('Session validation failed - no session found');
            setStatus('error');
            setMessage('Session validation failed - no session found');
          }
        } catch (error) {
          addLog(`Exception during code exchange: ${error instanceof Error ? error.message : String(error)}`);
          setStatus('error');
          setMessage('Exception during code exchange');
          setDetails({ error: error instanceof Error ? error.message : String(error) });
        }
      } catch (error) {
        addLog(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
        setStatus('error');
        setMessage('Unhandled error in callback test');
        setDetails({ error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    processCallback();
  }, [searchParams]);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Callback Test</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <div className="flex items-center mb-4">
            <div 
              className={`w-4 h-4 rounded-full mr-2 ${
                status === 'checking' ? 'bg-yellow-500 animate-pulse' :
                status === 'success' ? 'bg-green-500' :
                'bg-red-500'
              }`} 
            />
            <h2 className="text-xl font-semibold">
              Status: {status === 'checking' ? 'Checking...' : status === 'success' ? 'Success' : 'Error'}
            </h2>
          </div>
          
          <p className="mb-4">{message}</p>
          
          {Object.keys(details).length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Details:</h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Callback Process Logs</h2>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 h-60 overflow-y-auto font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  {log}
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No logs yet...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 