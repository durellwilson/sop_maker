'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

export default function MigratePage() {
  const { userProfile } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const handleMigrate = async () => {
    try {
      setStatus('loading');
      setMessage('Running migration...');
      
      // Call our migration endpoint
      const response = await fetch('/api/migrate-to-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('Migration completed successfully. You may need to reset your password to continue using the app.');
        setLogs(data.logs || []);
      } else {
        setStatus('error');
        setMessage(`Migration failed: ${data.error || 'Unknown error'}`);
        setLogs(data.logs || []);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const handleResetPassword = async () => {
    try {
      setStatus('loading');
      setMessage('Sending password reset email...');
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        userProfile?.email || '',
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );
      
      if (error) {
        setStatus('error');
        setMessage(`Failed to send reset email: ${error.message}`);
      } else {
        setStatus('success');
        setMessage('Password reset email sent. Please check your inbox.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Account Migration</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Migrate to Supabase Authentication</h2>
        <p className="mb-4">
          We've updated our authentication system to improve reliability and security.
          Click the button below to migrate your account.
        </p>
        
        {status === 'loading' && (
          <div className="bg-blue-50 p-4 rounded mb-4">
            <p className="text-blue-700">{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="bg-green-50 p-4 rounded mb-4">
            <p className="text-green-700">{message}</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="bg-red-50 p-4 rounded mb-4">
            <p className="text-red-700">{message}</p>
          </div>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={handleMigrate}
            disabled={status === 'loading'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {status === 'loading' ? 'Migrating...' : 'Migrate Account'}
          </button>
          
          <button
            onClick={handleResetPassword}
            disabled={status === 'loading' || !userProfile?.email}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Reset Password
          </button>
        </div>
      </div>
      
      {logs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded border">
          <h3 className="text-lg font-medium mb-2">Migration Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 