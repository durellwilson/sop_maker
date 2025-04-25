"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { SOP, Step, Media } from '@/types/database.types';
import { fetchSopDetailsForPreview } from '@/utils/api';
import Head from 'next/head';

export default function PreviewSopPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sop, setSop] = useState<SOP | null>(null);
  const [steps, setSteps] = useState<(Step & { media: Media[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const loadSopData = useCallback(async () => {
    if (!currentUser || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const { sop: fetchedSop, steps: fetchedSteps } = await fetchSopDetailsForPreview(token, id);
      setSop(fetchedSop);
      setSteps(fetchedSteps.sort((a, b) => a.order_index - b.order_index));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load SOP preview');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, id]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    } else if (currentUser && id) {
      loadSopData();
    }
  }, [currentUser, loading, router, id, loadSopData]);

  const handleImageError = (mediaId: string) => {
    setImageErrors(prev => ({ ...prev, [mediaId]: true }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Loading Preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto p-6 rounded-lg border border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Preview</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push(`/sop/${id}/edit`)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Return to Edit Page
          </button>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto p-6 rounded-lg border border-amber-200 bg-amber-50">
          <h2 className="text-lg font-semibold text-amber-700 mb-2">SOP Not Found</h2>
          <p className="text-amber-600">The requested SOP could not be found or may have been deleted.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <style type="text/css" media="print">{`
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        `}</style>
      </Head>
      
      <div className="min-h-screen bg-white">
        <div className="bg-primary-700 text-white shadow-md print:hidden">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold">SOP Preview</h1>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.push(`/sop/${id}/edit`)}
                className="px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-800 text-white transition-colors"
              >
                &larr; Back to Edit
              </button>
              <button 
                onClick={() => window.print()} 
                className="px-3 py-1.5 bg-white text-primary-700 rounded hover:bg-gray-100 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print / Export
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 print:shadow-none print:border-none">
            {/* Header Section */}
            <div className="bg-primary-50 p-8 border-b border-primary-100 text-center">
              <h1 className="text-4xl font-bold text-primary-800 mb-3">{sop.title}</h1>
              {sop.category && (
                <div className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium mb-4">
                  {sop.category}
                </div>
              )}
              {sop.description && (
                <p className="text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  {sop.description}
                </p>
              )}
            </div>
            
            {/* Steps Section */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-8 pb-2 border-b border-gray-200">
                Procedure Steps
              </h2>

              <ol className="space-y-10">
                {steps.map((step, index) => (
                  <li key={step.id} className="flex gap-4 sm:gap-6 relative">
                    {/* Vertical connector line between steps */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-6 sm:left-7 top-14 bottom-0 w-0.5 bg-primary-200" 
                           aria-hidden="true"></div>
                    )}
                    
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-primary-600 rounded-full flex items-center justify-center drop-shadow-md z-10">
                      <span className="text-xl sm:text-2xl font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-grow">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Step {index + 1}</h3>
                        <div className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-gray-200">
                          {step.instruction_text || step.instructions || <em className="text-gray-500">No instructions provided</em>}
                        </div>
                      </div>
                      
                      {step.media && step.media.length > 0 && (
                        <div className="space-y-4 mt-6">
                          {step.media.map((mediaItem) => (
                            <div key={mediaItem.id} className="border rounded-lg overflow-hidden shadow-md bg-white">
                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 className="font-medium text-gray-700">
                                  {mediaItem.type === 'video' ? 'Video' : 'Image'} Reference
                                </h4>
                              </div>
                              {(mediaItem.type === 'photo' || mediaItem.type === 'image') && (
                                <div className="relative" style={{ width: '100%', height: '400px' }}>
                                  {!imageErrors[mediaItem.id] ? (
                                    <div className="h-full flex flex-col">
                                      <img
                                        src={mediaItem.url}
                                        alt={mediaItem.caption || `Media for step ${index + 1}`}
                                        className={`w-full flex-grow p-2 ${mediaItem.display_mode === 'cover' ? 'object-cover' : 'object-contain'}`}
                                        style={{ objectFit: mediaItem.display_mode === 'cover' ? 'cover' : 'contain' }}
                                        onError={() => handleImageError(mediaItem.id)}
                                      />
                                      {mediaItem.caption && (
                                        <div className="p-2 bg-gray-100 border-t border-gray-200 text-center">
                                          <p className="text-gray-800">{mediaItem.caption}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-4">
                                      <div className="text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                        <p className="text-gray-600 font-medium">Image could not be loaded</p>
                                        <p className="text-sm text-gray-500 mt-1">The image might be unavailable or access restricted</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {mediaItem.type === 'video' && (
                                <div className="p-4">
                                  {!imageErrors[mediaItem.id] ? (
                                    <div>
                                      <video 
                                        controls 
                                        src={mediaItem.url} 
                                        className="w-full max-w-2xl mx-auto rounded border border-gray-200"
                                        onError={() => handleImageError(mediaItem.id)}
                                      >
                                        Your browser does not support the video tag.
                                      </video>
                                      {mediaItem.caption && (
                                        <div className="mt-2 p-2 bg-gray-100 border border-gray-200 rounded text-center">
                                          <p className="text-gray-800">{mediaItem.caption}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center bg-gray-100 rounded-lg">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-2">
                                        <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                      </svg>
                                      <p className="text-gray-600 font-medium">Video could not be loaded</p>
                                      <p className="text-sm text-gray-500 mt-1">The video might be unavailable or in an unsupported format</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              
              {steps.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No steps have been added to this SOP yet</p>
                  <button 
                    onClick={() => router.push(`/sop/${id}/edit`)}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Steps
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer (only visible when printing) */}
            <div className="hidden print:block p-6 text-center text-gray-500 text-sm border-t">
              <p>Printed from SOP Maker • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 