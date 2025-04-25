'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SOP } from '@/types/database.types';
import { formatDate } from '@/utils/date-helpers';
import { withDatabaseFix } from '@/utils/fix-database';

/**
 * SOP List Page
 * This page displays all SOPs the user has access to
 */
export default function SOPListPage() {
  const { user, isLoading, isAuthenticated, getToken } = useAuthContext();
  const router = useRouter();
  const [sops, setSops] = useState<SOP[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch SOPs when the component mounts
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin?redirectTo=/sop');
      return;
    }

    // Fetch SOPs from the API
    const fetchSOPs = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setDataLoading(true);
        setError(null);
        
        // Get auth token
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }
        
        // Fetch SOPs with database fix fallback
        const fetchData = async () => {
          const response = await fetch('/api/sops', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch SOPs');
          }
          
          const data = await response.json();
          return data.data || [];
        };
        
        // Use withDatabaseFix to handle potential database issues
        const fetchedSops = await withDatabaseFix(fetchData);
        setSops(fetchedSops);
      } catch (err) {
        console.error('Error fetching SOPs:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching SOPs');
        
        // If we have no SOPs, provide empty array so UI doesn't break
        setSops([]);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchSOPs();
    }
  }, [user, isLoading, isAuthenticated, router, getToken]);

  // Loading state
  if (isLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOPs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Standard Operating Procedures</h1>
        <Link href="/sop/create">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create New SOP
          </button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
          >
            Try refreshing the page
          </button>
        </div>
      )}
      
      {sops.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">No SOPs found.</p>
          <p className="text-gray-500 dark:text-gray-400">
            Get started by creating your first Standard Operating Procedure.
          </p>
          <Link href="/sop/create">
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Create SOP
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.map((sop) => (
            <Link key={sop.id} href={`/sop/${sop.id}`}>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">{sop.title}</h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    {sop.category || 'Uncategorized'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {sop.description || 'No description provided.'}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {sop.created_at ? `Created ${formatDate(sop.created_at)}` : 'Recently created'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    sop.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                    sop.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {sop.status || 'Draft'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 