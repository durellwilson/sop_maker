'use client';

import { useState } from 'react';

export default function FixDatabasePage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const fixExecSqlFunction = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/fix-exec-sql');
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
      
      setResult(data);
    } catch (error) {
      setStatus('error');
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const runMigrations = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/db-setup');
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
      
      setResult(data);
    } catch (error) {
      setStatus('error');
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Database Fix Tool</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Fix exec_sql Function</h2>
          <p className="mb-4 text-gray-600">
            This will fix the exec_sql function in your Supabase database, which is required
            for running migrations and other database operations.
          </p>
          
          <button
            onClick={fixExecSqlFunction}
            disabled={status === 'loading'}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {status === 'loading' ? 'Fixing...' : 'Fix exec_sql Function'}
          </button>
          
          {status === 'success' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">
              ✅ exec_sql function fixed successfully!
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
              ❌ Error fixing exec_sql function. See console for details.
            </div>
          )}
        </div>
        
        {status === 'success' && (
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Run Migrations</h2>
            <p className="mb-4 text-gray-600">
              Now that the exec_sql function is fixed, you can run your migrations to set up
              the database schema.
            </p>
            
            <button
              onClick={runMigrations}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              Run Migrations
            </button>
          </div>
        )}
        
        {result && (
          <div className="bg-gray-50 p-4 mt-4 rounded border">
            <h3 className="font-semibold mb-2">Result Details:</h3>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        <p>
          After fixing the database, refresh your main application page to see the changes.
        </p>
      </div>
    </div>
  );
} 