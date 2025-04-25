'use client';

import { useState } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';

export default function DatabaseStatus() {
  const { supabaseSession } = useAuthContext();
  const [isChecking, setIsChecking] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Simple check of user and database status
  const checkStatus = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        setError(`Health check failed: ${response.status}`);
        setResults(null);
      } else {
        const result = await response.json();
        setResults({ health: result });
      }
    } catch (err) {
      setError(`Health check error: ${err instanceof Error ? err.message : String(err)}`);
      setResults(null);
    } finally {
      setIsChecking(false);
    }
  };
  
  // Run a full database diagnostic
  const diagnoseDatabase = async () => {
    setIsDiagnosing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fix-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        setError(`Database diagnosis failed: ${response.status}`);
        setResults(null);
      } else {
        const result = await response.json();
        setResults(result);
      }
    } catch (err) {
      setError(`Database diagnosis error: ${err instanceof Error ? err.message : String(err)}`);
      setResults(null);
    } finally {
      setIsDiagnosing(false);
    }
  };
  
  // Run a full database repair
  const repairDatabase = async () => {
    setIsRepairing(true);
    setError(null);
    
    try {
      // First create required SQL functions
      const functionsResponse = await fetch('/api/create-functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!functionsResponse.ok) {
        setError(`Function creation failed: ${functionsResponse.status}`);
      }
      
      const functionsResult = await functionsResponse.json();
      
      // Then fix the schema
      const schemaResponse = await fetch('/api/fix-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!schemaResponse.ok) {
        setError(`Schema fix failed: ${schemaResponse.status}`);
      }
      
      const schemaResult = await schemaResponse.json();
      
      // Then initialize the database
      const fixResponse = await fetch('/api/fix-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!fixResponse.ok) {
        setError(`Database initialization failed: ${fixResponse.status}`);
      }
      
      const fixResult = await fixResponse.json();
      
      // Show all the results
      setResults({
        functions: functionsResult,
        schema: schemaResult,
        init: fixResult
      });
    } catch (err) {
      setError(`Database repair error: ${err instanceof Error ? err.message : String(err)}`);
      setResults(null);
    } finally {
      setIsRepairing(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-4">Database Status</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 dark:text-gray-300">
          User: {supabaseSession ? `${supabaseSession.user.email} (${supabaseSession.user.id})` : 'Not logged in'}
        </p>
      </div>
      
      <div className="flex flex-col gap-2 mb-4">
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isChecking ? 'Checking...' : 'Quick Check'}
        </button>
        
        <button
          onClick={diagnoseDatabase}
          disabled={isDiagnosing}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
        >
          {isDiagnosing ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>
        
        <button
          onClick={repairDatabase}
          disabled={isRepairing}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          {isRepairing ? 'Repairing...' : 'Repair Database'}
        </button>
      </div>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      {results && (
        <div className="mt-4 border rounded p-2 overflow-auto max-h-64">
          <pre className="text-xs text-gray-800 dark:text-gray-200">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 