'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger/index';
import Link from 'next/link';

export default function AdminDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const initializeDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Starting database initialization');
      const response = await fetch('/api/init-all-tables');
      const data = await response.json();
      
      logger.info('Database initialization completed', data);
      setResult(data);
      
      // Force refresh to update any components that depend on DB state
      router.refresh();
    } catch (err) {
      logger.error('Error initializing database:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const troubleshootDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Starting database troubleshooting');
      const response = await fetch('/api/db-troubleshoot');
      const data = await response.json();
      
      logger.info('Database troubleshooting completed', data);
      setResult(data);
    } catch (err) {
      logger.error('Error troubleshooting database:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Database Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Database Initialization</h2>
          <p className="text-gray-600 mb-4">
            Initialize or repair the database structure. This will create any missing tables
            and ensure the database is properly set up.
          </p>
          <button
            onClick={initializeDatabase}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Initializing...' : 'Initialize Database'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Database Troubleshooting</h2>
          <p className="text-gray-600 mb-4">
            Run diagnostics to check the current state of the database and identify any issues.
          </p>
          <button
            onClick={troubleshootDatabase}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Running Diagnostics...' : 'Troubleshoot Database'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Security Management</h2>
          <p className="text-gray-600 mb-4">
            Address security issues identified by the Supabase Security Advisor, such as missing RLS policies 
            and function search path vulnerabilities.
          </p>
          <Link 
            href="/admin/security"
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors"
          >
            Manage Security Settings
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-700 font-medium mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-lg">Operation Result</h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.success ? 'Success' : 'Failed'}
              </span>
              <p className="mt-2 text-gray-700">{result.message}</p>
            </div>
            
            {result.table_initialization?.results && (
              <div className="mb-6">
                <h4 className="font-medium text-lg mb-3">Table Initialization Results</h4>
                <div className="bg-gray-50 rounded-md p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.table_initialization.results.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.action}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                              item.status === 'success' ? 'bg-green-100 text-green-800' : 
                              item.status === 'failed' ? 'bg-red-100 text-red-800' :
                              item.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Full Response:</h4>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 