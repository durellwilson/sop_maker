import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSession } from '@/utils/auth-helpers';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default async function SOPDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  
  // If not authenticated, redirect to login
  if (!session?.user) {
    redirect('/login?next=/sops/' + params.id);
  }
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Fetch SOP with steps
  const { data: sop, error } = await supabase
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
        title,
        description,
        estimated_time
      )
    `)
    .eq('id', params.id)
    .single();
  
  // Check permissions if not admin
  if (error || !sop) {
    notFound();
  }
  
  // If user is not admin and not the owner, don't allow access
  if (session.user.role !== 'admin' && sop.user_id !== session.user.id) {
    redirect('/sops');
  }
  
  // Sort steps by step_number
  const sortedSteps = [...(sop.sop_steps || [])].sort((a, b) => a.step_number - b.step_number);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link 
          href="/sops" 
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to SOPs
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sop.title}</h1>
              {sop.description && (
                <p className="mt-2 text-gray-600">{sop.description}</p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Link
                href={`/sops/${sop.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit
              </Link>
              
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
                Export
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span>Last updated {formatDistanceToNow(new Date(sop.updated_at), { addSuffix: true })}</span>
            <span className="mx-2">•</span>
            <span>{sortedSteps.length} steps</span>
          </div>
        </div>
        
        <div className="p-6">
          {sortedSteps.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">No steps added yet</h3>
              <p className="text-gray-500 mb-4">Add steps to complete this SOP</p>
              <Link 
                href={`/sops/${sop.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Steps
              </Link>
            </div>
          ) : (
            <ol className="space-y-8">
              {sortedSteps.map((step) => (
                <li key={step.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex">
                    <div className="flex-shrink-0 mr-4">
                      <div className="bg-blue-100 text-blue-800 font-semibold w-8 h-8 rounded-full flex items-center justify-center">
                        {step.step_number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                      {step.description && (
                        <div className="mt-2 text-gray-600 prose prose-sm max-w-none">
                          {step.description}
                        </div>
                      )}
                      {step.estimated_time && (
                        <div className="mt-3 flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>Estimated time: {step.estimated_time} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
} 