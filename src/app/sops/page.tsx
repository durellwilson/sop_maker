import { Suspense } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/utils/auth-helpers';
import SOPList from '@/components/sops/SopList';
import CreateSOPButton from '@/components/sops/CreateSOPButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default async function SOPsPage() {
  // Try to get session, but handle errors gracefully
  let session;
  try {
    session = await getSession();
  } catch (error) {
    console.error('Error getting session:', error);
    // Let the page continue rendering, we'll handle auth in the client component
  }
  
  // If explicitly not authenticated, redirect to login
  if (session && !session.user) {
    redirect('/login?next=/sops');
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your SOPs</h1>
        <CreateSOPButton />
      </div>
      
      <Suspense fallback={<LoadingState />}>
        <SOPListContainer />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size="large" />
    </div>
  );
}

async function SOPListContainer() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: sops, error } = await supabase
      .from('user_sops')
      .select(`
        id, 
        title, 
        description, 
        created_at, 
        updated_at, 
        user_id,
        sop_steps (
          id,
          step_number,
          order_index,
          title,
          description
        )
      `)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error loading SOPs from Supabase:', error);
      
      // Try to fetch from API as fallback (this will use Firebase auth if available)
      try {
        const response = await fetch('/api/sops', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const apiData = await response.json();
        
        if (apiData.data && Array.isArray(apiData.data)) {
          console.log('Successfully loaded SOPs from API fallback');
          return <SOPList sops={apiData.data} />;
        }
      } catch (apiError) {
        console.error('Error loading SOPs from API fallback:', apiError);
      }
      
      return (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <h3 className="text-red-800 font-medium">Error loading SOPs</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      );
    }
    
    if (!sops || sops.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-medium text-gray-800 mb-2">No SOPs found</h3>
          <p className="text-gray-600 mb-6">Create your first SOP to get started</p>
          <CreateSOPButton variant="primary" />
        </div>
      );
    }
    
    return <SOPList sops={sops} />;
  } catch (error) {
    console.error('Error in SOPListContainer:', error);
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200">
        <h3 className="text-red-800 font-medium">Something went wrong</h3>
        <p className="text-red-600">
          {error instanceof Error ? error.message : 'Unknown error loading SOPs'}
        </p>
        <p className="mt-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }
} 