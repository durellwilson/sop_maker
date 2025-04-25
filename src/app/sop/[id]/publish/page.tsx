"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { SOP, Step, Media } from '@/types/database.types';
import { fetchSopDetailsForPreview } from '@/utils/api';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import React from 'react';

export default function PublishSopPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const unwrappedParams = React.use(useParams());
  const id = unwrappedParams.id as string;
  const { showToast } = useToast();

  const [sop, setSop] = useState<SOP | null>(null);
  const [steps, setSteps] = useState<(Step & { media: Media[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishData, setPublishData] = useState({
    isPublic: true,
    allowComments: true,
    requireAuth: false,
    allowPrinting: true,
    allowDownload: true,
    expiryDate: '',
    password: '',
  });
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  const loadSopData = useCallback(async () => {
    if (!currentUser || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const { sop: fetchedSop, steps: fetchedSteps } = await fetchSopDetailsForPreview(token, id);
      setSop(fetchedSop);
      setSteps(fetchedSteps.sort((a, b) => a.order_index - b.order_index));
      setIsPublished(!!fetchedSop.is_published);
      
      // If already published, generate public URL
      if (fetchedSop.is_published) {
        setPublishUrl(`${window.location.origin}/shared/${id}`);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load SOP data');
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

  const handlePublish = async () => {
    if (!currentUser || !id || !sop) return;
    
    setIsPublishing(true);
    setError(null);
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/sops/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publishSettings: publishData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish SOP');
      }
      
      const data = await response.json();
      
      // Show success UI
      setIsPublished(true);
      setPublishUrl(`${window.location.origin}/shared/${id}`);
      showToast('SOP published successfully!', 'success');
      
    } catch (err) {
      console.error('Error publishing SOP:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish SOP');
      showToast('Failed to publish SOP', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (publishUrl) {
      navigator.clipboard.writeText(publishUrl);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto p-6 rounded-lg border border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-green-600 to-green-800 dark:from-green-800 dark:to-green-900 p-4 text-white rounded-b-lg mb-4 glass-navbar">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isPublished ? 'SOP Published' : 'Publish SOP'}
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/sop/${id}/edit`)}
                className="bg-white text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center font-medium transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit SOP
              </button>
              
              <button
                onClick={() => router.push(`/sop/${id}/preview`)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center font-medium transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
            </div>
          </div>
        </header>
        
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="glass-card dark:glass-card-dark rounded-xl shadow-lg overflow-hidden">
            {/* Main content */}
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{sop.title}</h2>
              
              {sop.category && (
                <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-medium mb-4">
                  {sop.category}
                </div>
              )}
              
              {sop.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-3xl">
                  {sop.description}
                </p>
              )}

              {isPublished ? (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
                  <div className="flex items-start mb-4">
                    <svg className="h-6 w-6 text-green-500 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">SOP Published Successfully!</h3>
                      <p className="mt-1 text-green-700 dark:text-green-400">Your SOP is now available for sharing.</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shareable Link:</p>
                    <div className="flex">
                      <input 
                        type="text" 
                        value={publishUrl || ''} 
                        readOnly 
                        className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <a 
                      href={publishUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center"
                    >
                      View Published SOP
                    </a>
                    
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Publish Settings</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">Public Access</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow anyone with the link to view this SOP</p>
                      </div>
                      <div className="form-switch">
                        <input 
                          type="checkbox" 
                          id="isPublic"
                          checked={publishData.isPublic}
                          onChange={e => setPublishData({...publishData, isPublic: e.target.checked})}
                          className="sr-only"
                        />
                        <label 
                          htmlFor="isPublic"
                          className={`relative inline-block w-12 h-6 rounded-full cursor-pointer transition-colors ${publishData.isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`block w-4 h-4 mt-1 ml-1 bg-white rounded-full shadow transform transition-transform ${publishData.isPublic ? 'translate-x-6' : ''}`}
                          ></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">Allow Comments</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable viewers to leave comments on the SOP</p>
                      </div>
                      <div className="form-switch">
                        <input 
                          type="checkbox" 
                          id="allowComments"
                          checked={publishData.allowComments}
                          onChange={e => setPublishData({...publishData, allowComments: e.target.checked})}
                          className="sr-only"
                        />
                        <label 
                          htmlFor="allowComments"
                          className={`relative inline-block w-12 h-6 rounded-full cursor-pointer transition-colors ${publishData.allowComments ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`block w-4 h-4 mt-1 ml-1 bg-white rounded-full shadow transform transition-transform ${publishData.allowComments ? 'translate-x-6' : ''}`}
                          ></span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">Allow Printing</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable viewers to print the SOP</p>
                      </div>
                      <div className="form-switch">
                        <input 
                          type="checkbox" 
                          id="allowPrinting"
                          checked={publishData.allowPrinting}
                          onChange={e => setPublishData({...publishData, allowPrinting: e.target.checked})}
                          className="sr-only"
                        />
                        <label 
                          htmlFor="allowPrinting"
                          className={`relative inline-block w-12 h-6 rounded-full cursor-pointer transition-colors ${publishData.allowPrinting ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`block w-4 h-4 mt-1 ml-1 bg-white rounded-full shadow transform transition-transform ${publishData.allowPrinting ? 'translate-x-6' : ''}`}
                          ></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPublishing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Publishing...
                        </>
                      ) : (
                        <>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 mr-2" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Publish SOP
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Note About Publishing</h4>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                      Publishing makes your SOP available via a shareable link. Make sure your SOP is complete before publishing.
                      <br />You can update the published SOP any time by making changes and republishing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 