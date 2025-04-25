'use client';

import { useState, useEffect } from 'react';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger/index';

type DiagnosticStatus = 'healthy' | 'warning' | 'error' | 'loading';

interface DiagnosticResults {
  timestamp: string;
  status: DiagnosticStatus;
  environment: {
    nodeEnv: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: any;
    cpuUsage: any;
  };
  database: {
    connected: boolean;
    status: DiagnosticStatus;
    info: any;
    issues: string[];
    recommendations: string[];
    error?: string;
  };
  firebase: {
    initialized: boolean;
    status: DiagnosticStatus;
    issues: string[];
    recommendations: string[];
    error?: string;
  };
}

function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchDiagnostics() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/diagnostics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Diagnostics API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setResults(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to fetch diagnostics', err instanceof Error ? err : new Error(errorMessage));
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDiagnostics();
  }, [refreshKey]);
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  const getStatusColor = (status: DiagnosticStatus): string => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'loading': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusText = (status: DiagnosticStatus): string => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'error': return 'Error';
      case 'loading': return 'Loading';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Diagnostics</h1>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {loading && !results && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {results && (
        <div className="space-y-8">
          {/* Overall Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Overall Status</h2>
              <span className={`${getStatusColor(results.status)} text-white px-3 py-1 rounded-full text-sm`}>
                {getStatusText(results.status)}
              </span>
            </div>
            <p className="text-gray-600">Last updated: {new Date(results.timestamp).toLocaleString()}</p>
          </div>
          
          {/* Environment Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Node Environment:</span> {results.environment.nodeEnv}</p>
                <p><span className="font-medium">Node Version:</span> {results.environment.nodeVersion}</p>
                <p><span className="font-medium">Platform:</span> {results.environment.platform}</p>
              </div>
              <div>
                <p><span className="font-medium">Uptime:</span> {formatUptime(results.environment.uptime)}</p>
                <p><span className="font-medium">Memory:</span> {formatBytes(results.environment.memoryUsage.rss)}</p>
              </div>
            </div>
          </div>
          
          {/* Database Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Database</h2>
              <span className={`${getStatusColor(results.database.status)} text-white px-3 py-1 rounded-full text-sm`}>
                {getStatusText(results.database.status)}
              </span>
            </div>
            
            {results.database.error && (
              <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
                <p className="font-medium">Error: {results.database.error}</p>
              </div>
            )}
            
            {results.database.connected && results.database.info && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Information</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p><span className="font-medium">PostgreSQL Version:</span> {results.database.info.postgres_version}</p>
                  <p><span className="font-medium">Database:</span> {results.database.info.database_name}</p>
                  <p><span className="font-medium">User:</span> {results.database.info.current_user}</p>
                  <p><span className="font-medium">Tables:</span> {results.database.info.table_count}</p>
                </div>
              </div>
            )}
            
            {results.database.issues && results.database.issues.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Issues</h3>
                <ul className="list-disc list-inside bg-red-50 p-4 rounded">
                  {results.database.issues.map((issue, index) => (
                    <li key={`db-issue-${index}`} className="text-red-800 mb-1">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.database.recommendations && results.database.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                <ul className="list-disc list-inside bg-blue-50 p-4 rounded">
                  {results.database.recommendations.map((rec, index) => (
                    <li key={`db-rec-${index}`} className="text-blue-800 mb-1">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Firebase Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Firebase</h2>
              <span className={`${getStatusColor(results.firebase.status)} text-white px-3 py-1 rounded-full text-sm`}>
                {getStatusText(results.firebase.status)}
              </span>
            </div>
            
            {results.firebase.error && (
              <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
                <p className="font-medium">Error: {results.firebase.error}</p>
              </div>
            )}
            
            {results.firebase.issues && results.firebase.issues.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Issues</h3>
                <ul className="list-disc list-inside bg-red-50 p-4 rounded">
                  {results.firebase.issues.map((issue, index) => (
                    <li key={`firebase-issue-${index}`} className="text-red-800 mb-1">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.firebase.recommendations && results.firebase.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                <ul className="list-disc list-inside bg-blue-50 p-4 rounded">
                  {results.firebase.recommendations.map((rec, index) => (
                    <li key={`firebase-rec-${index}`} className="text-blue-800 mb-1">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default withErrorBoundary(DiagnosticsPage); 