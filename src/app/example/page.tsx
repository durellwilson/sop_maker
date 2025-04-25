import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * Example React Server Component showing how to use Supabase
 * following modern best practices from Next.js 14 and Supabase documentation
 */
export default async function ExamplePage() {
  // Create a Supabase client for this Server Component
  const supabase = await createClient();

  // Check authentication using new APIs
  const { data: { session } } = await supabase.auth.getSession();
  
  // If no session, redirect to login
  if (!session) {
    redirect('/api/auth/signin');
  }
  
  // Fetch SOPs with native async/await pattern
  const { data: sops, error } = await supabase
    .from('sops')
    .select('id, title, description, category, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching SOPs:', error);
    return <div>Error loading SOPs: {error.message}</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your SOPs</h1>
      
      {sops && sops.length > 0 ? (
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
              <div className="mt-3 flex gap-2">
                <Link 
                  href={`/sop/${sop.id}/edit`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </Link>
                <Link
                  href={`/sop/${sop.id}/preview`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Preview
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No SOPs found</p>
          <Link 
            href="/sop/create" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First SOP
          </Link>
        </div>
      )}
    </div>
  );
} 