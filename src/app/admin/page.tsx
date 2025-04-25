'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runMigration = async () => {
    if (!currentUser) return;

    setIsRunning(true);
    setError(null);
    setMigrationResult(null);

    try {
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Migration failed');
      } else {
        setMigrationResult(data.message || 'Migration completed successfully');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!currentUser) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary-800">Admin Dashboard</h1>
          <p className="text-gray-600">User ID: {currentUser.uid}</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Database Migrations</h2>
          
          <button
            onClick={runMigration}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Migration...' : 'Run Migration: Add firebase_uid column'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {migrationResult && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              <strong>Success:</strong> {migrationResult}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary-600 hover:text-primary-800"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 