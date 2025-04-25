'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase'; // Import client-side supabase client

interface SOP {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

/**
 * Example Client Component showing proper client-side Supabase usage
 * following modern best practices from Next.js 14 and Supabase documentation
 */
export default function ExampleClientPage() {
  const [sops, setSops] = useState<SOP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch SOPs when component mounts
    async function fetchSOPs() {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('sops')
          .select('id, title, description, category, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        setSops(data || []);
      } catch (err) {
        console.error('Error fetching SOPs:', err);
        setError('Failed to load SOPs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSOPs();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your SOPs (Client-side)</h1>
      
      {sops.length > 0 ? (
        <div className="space-y-4">
          {sops.map((sop) => (
            <div key={sop.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{sop.title}</h2>
              {sop.description && (
                <p className="mt-1 text-gray-600">{sop.description}</p>
              )}
              {sop.category && (
                <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {sop.category}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No SOPs found</p>
        </div>
      )}
    </div>
  );
} 