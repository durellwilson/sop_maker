"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { SOP, Step, MediaType } from '@/types/database.types';
import { 
  fetchSopDetails, 
  addStep, 
  updateStep,
  updateSOP,
  deleteStep, 
  uploadMedia, 
  generateInstructions 
} from '@/utils/api';
import StepEditor from '@/components/StepEditor';
import { useToast } from '@/contexts/ToastContext';

export default function EditSopPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const shouldPrepopulate = searchParams.get('prepopulate') === 'true';
  const { showSuccess, showError, showInfo } = useToast();

  const [sop, setSop] = useState<SOP | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sopTitle, setSopTitle] = useState('');
  const [sopCategory, setSopCategory] = useState('');
  const [sopDescription, setSopDescription] = useState('');
  const [theme, setTheme] = useState<string>('default');
  const [showStepNav, setShowStepNav] = useState(false);
  
  // Add ref for scrolling to bottom
  const bottomRef = useRef<HTMLDivElement>(null);

  // Apply theme to body element when it changes
  useEffect(() => {
    // Remove all theme classes first
    document.body.classList.remove('theme-ocean', 'theme-forest', 'theme-sunset');
    
    // Add the new theme class if not default
    if (theme !== 'default') {
      document.body.classList.add(`theme-${theme}`);
    }
    
    // Store the theme preference in localStorage
    localStorage.setItem('sop-maker-theme', theme);
  }, [theme]);

  // Load saved theme preference on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('sop-maker-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const loadSopData = useCallback(async () => {
    if (!currentUser || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const { sop: fetchedSop, steps: fetchedSteps } = await fetchSopDetails(token, id);
      setSop(fetchedSop);
      setSopTitle(fetchedSop.title);
      setSopCategory(fetchedSop.category || '');
      setSopDescription(fetchedSop.description || '');
      setSteps(fetchedSteps.sort((a, b) => a.order_index - b.order_index));
      
      // After loading the SOP, check if we should prepopulate steps
      if (shouldPrepopulate && fetchedSteps.length === 0) {
        showInfo('Creating SOP steps from wizard data...');
        try {
          await createPrePopulatedSteps();
        } catch (err) {
          console.error('Error creating prepopulated steps:', err);
          showError('Failed to create all steps from wizard. You can add them manually.');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load SOP details');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, id, shouldPrepopulate]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    } else if (currentUser && id) {
      loadSopData();
    }
  }, [currentUser, loading, router, id, loadSopData]);

  const handleSaveSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !id) return;
    setError(null);
    setIsSaving(true);
    
    try {
      const token = await currentUser.getIdToken();
      await updateSOP(token, id, {
        title: sopTitle,
        category: sopCategory,
        description: sopDescription,
      });
      setSop({
        ...(sop as SOP),
        title: sopTitle,
        category: sopCategory,
        description: sopDescription,
      });
      setIsEditing(false);
      showSuccess('SOP details saved successfully');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save SOP');
      showError('Failed to save SOP');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to scroll to the bottom of the steps list
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Function to scroll to a specific step
  const scrollToStep = (stepId: string) => {
    const element = document.getElementById(`step-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Show step navigation when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowStepNav(true);
      } else {
        setShowStepNav(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddStep = async () => {
    if (!currentUser || !id) return;
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const newStepNumber = steps.length > 0 ? Math.max(...steps.map(s => s.order_index)) + 1 : 1;
      const newStepData: Partial<Step> = {
        sop_id: id,
        order_index: newStepNumber,
        title: `Step ${newStepNumber}`,
        instructions: '', // Empty string as default
      };
      const createdStep = await addStep(token, newStepData);
      setSteps([...steps, createdStep].sort((a, b) => a.order_index - b.order_index));
      showSuccess(`Step ${newStepNumber} added successfully`);
      
      // Scroll to the new step
      setTimeout(() => {
        const element = document.getElementById(`step-${createdStep.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-new-step');
          setTimeout(() => {
            element.classList.remove('highlight-new-step');
          }, 2000);
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add step');
      showError('Failed to add step');
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<Step>): Promise<Step> => {
    if (!currentUser) throw new Error('Not authenticated');
    
    // Track whether this update contains media changes
    const hasMediaUpdates = updates.media !== undefined;
    
    try {
      const token = await currentUser.getIdToken();
      
      // If updating with media, add a small delay to prevent race conditions
      if (hasMediaUpdates) {
        await new Promise(resolve => setTimeout(resolve, 700));
        console.log(`Updating step ${stepId} with media changes`, updates.media);
      }
      
      // Make multiple attempts if needed
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts} to update step ${stepId}`);
          
          const updatedStep = await updateStep(token, stepId, updates);
          
          // If we get here, the update succeeded
          setSteps(prevSteps => prevSteps.map(step => 
            step.id === stepId ? updatedStep : step
          ));
          
          if (hasMediaUpdates) {
            console.log(`Successfully updated step ${stepId} with media changes`);
          }
          
          return updatedStep;
        } catch (err) {
          lastError = err;
          console.error(`Error updating step (attempt ${attempts}/${maxAttempts}):`, err);
          
          // If we've reached max attempts, we'll throw outside the loop
          if (attempts >= maxAttempts) {
            break;
          }
          
          // Add exponential backoff between retries with jitter
          const backoffMs = 300 * Math.pow(2, attempts) + Math.random() * 300;
          console.log(`Retrying in ${Math.round(backoffMs)}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
      
      // If we got here, all attempts failed
      throw lastError || new Error('Failed to update step after multiple attempts');
    } catch (err) {
      console.error('Failed to update step after multiple attempts:', err);
      
      // Create a descriptive error message
      let errorMessage = 'Failed to update step';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // If it's an empty error response, provide more context
        if (errorMessage.includes('API returned empty error') || errorMessage === 'API Error: {}') {
          if (hasMediaUpdates) {
            errorMessage = 'Failed to update media. There may be an issue with the media service.';
          }
        }
      }
      
      // For media updates, provide a more helpful error message
      if (hasMediaUpdates) {
        showError(errorMessage + ' The upload may have completed but failed to update the database. You might need to refresh.');
      } else {
        showError(errorMessage);
      }
      
      throw err;
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await deleteStep(token, stepId);
      
      // Remove step from the list
      setSteps(steps.filter(step => step.id !== stepId));
      
      // Update order_index values if needed
      const remainingSteps = steps.filter(step => step.id !== stepId);
      if (remainingSteps.length > 0) {
        // Update step numbers in the UI immediately
        const updatedSteps = remainingSteps.map((step, index) => ({
          ...step,
          order_index: index + 1
        }));
        setSteps(updatedSteps);
        
        // Update step numbers in the database
        const token = await currentUser.getIdToken();
        for (const step of updatedSteps) {
          if (step.order_index !== steps.find(s => s.id === step.id)?.order_index) {
            await updateStep(token, step.id, { order_index: step.order_index });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete step');
      showError('Failed to delete step');
      throw err;
    }
  };

  const handleGenerateInstructions = async (stepId: string, prompt: string) => {
    if (!currentUser) return;
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      // Use current instruction as prompt, or construct a default prompt
      const effectivePrompt = prompt || `Generate instructions for step ${steps.find(s => s.id === stepId)?.order_index} of SOP: ${sop?.title}`;
      showInfo('Generating instructions with AI...');
      const generatedText = await generateInstructions(token, effectivePrompt);
      const updatedStep = await updateStep(token, stepId, { instructions: generatedText });
      setSteps(steps.map(step => step.id === stepId ? updatedStep : step));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate instructions');
      showError('Failed to generate instructions');
      throw err;
    }
  };

  const handleMediaUpload = async (stepId: string, file: File) => {
    if (!currentUser || !id) return null;
    setError(null);
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    
    // Create a unique ID for this upload for tracking
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`Starting upload ${uploadId} for file: ${file.name}, type: ${mediaType}, size: ${file.size} bytes`);
    
    try {
      // Server-side upload approach (primary method)
      try {
        const token = await currentUser.getIdToken();
        console.log(`Upload ${uploadId}: Sending upload request to server...`);
        
        // Make a direct API call to the upload endpoint
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sopId', id);
        formData.append('stepId', stepId);
        formData.append('type', mediaType);
        
        // First try - normal fetch
        const response = await fetch('/api/upload-media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        console.log(`Upload ${uploadId}: Response status:`, response.status, response.statusText);
        
        // Clone the response for debugging in case parsing JSON fails
        const responseClone = response.clone();
        
        let responseText;
        let responseData;
        try {
          responseText = await responseClone.text();
          console.log(`Upload ${uploadId}: Raw response:`, responseText);
          
          // Try to parse the response text as JSON if it's not empty
          if (responseText && responseText.trim()) {
            try {
              responseData = JSON.parse(responseText);
              console.log(`Upload ${uploadId}: Parsed response data:`, responseData);
            } catch (jsonError) {
              console.error(`Upload ${uploadId}: Error parsing response as JSON:`, jsonError);
            }
          }
        } catch (textError) {
          console.error(`Upload ${uploadId}: Error reading response text:`, textError);
        }
        
        if (!response.ok) {
          let errorMessage = `Upload failed with status ${response.status}`;
          
          // Extract detailed error information from the response if available
          if (responseData) {
            console.error(`Upload ${uploadId}: Upload response error data:`, responseData);
            
            if (responseData.error) {
              errorMessage = responseData.error;
            }
            
            if (responseData.message) {
              errorMessage += `: ${responseData.message}`;
            }
            
            if (responseData.details) {
              console.error(`Upload ${uploadId}: Detailed error:`, responseData.details);
              
              // If there's a specific code or message in the details, include it
              if (typeof responseData.details === 'object') {
                if (responseData.details.code) {
                  errorMessage += ` (code: ${responseData.details.code})`;
                }
                if (responseData.details.message && responseData.details.message !== responseData.message) {
                  errorMessage += ` - ${responseData.details.message}`;
                }
              }
            }
          }
          
          throw new Error(errorMessage);
        }
        
        let data;
        try {
          // Try to parse the successful response as JSON
          if (responseText && responseText.trim()) {
            data = JSON.parse(responseText);
          } else {
            throw new Error('Empty response from server');
          }
          console.log(`Upload ${uploadId}: Upload response data:`, data);
        } catch (jsonError) {
          console.error(`Upload ${uploadId}: Error parsing success response:`, jsonError);
          throw new Error('Failed to parse upload response');
        }
        
        if (!data || !data.media) {
          console.error(`Upload ${uploadId}: Invalid response data - missing media object:`, data);
          throw new Error('Server response missing media data');
        }
        
        // Return the uploaded media object
        return data.media;
        
      } catch (serverError) {
        // If server-side upload fails, try client-side direct upload as fallback
        console.error(`Upload ${uploadId}: Server-side upload failed, trying direct client upload:`, serverError);
        
        // Get fresh Supabase credentials
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase configuration');
        }
        
        console.log(`Upload ${uploadId}: Attempting direct client-side upload to Supabase...`);
        
        // We'll need to dynamically import Supabase to avoid SSR issues
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // First, ensure we're authenticated with Supabase
        const idToken = await currentUser.getIdToken();
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        
        if (signInError) {
          console.error(`Upload ${uploadId}: Supabase auth error:`, signInError);
          // Continue anyway - we might still be able to upload as anonymous
        }
        
        // Attempt to create bucket if needed via RPC
        try {
          await supabase.rpc('admin_create_storage_bucket', {
            p_id: 'media',
            p_name: 'media',
            p_public: true,
            p_file_size_limit: 50000000
          });
          console.log(`Upload ${uploadId}: Bucket creation attempted via RPC`);
        } catch (bucketError) {
          console.warn(`Upload ${uploadId}: Bucket creation RPC failed (non-critical):`, bucketError);
        }
        
        // Prepare file path
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const storageFileName = `${id}/${stepId}/${mediaType}_${Date.now()}.${fileExtension}`;
        
        // Upload directly from client
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(storageFileName, file, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`Upload ${uploadId}: Direct client upload failed:`, uploadError);
          throw new Error(`Direct upload failed: ${uploadError.message}`);
        }
        
        if (!uploadData || !uploadData.path) {
          console.error(`Upload ${uploadId}: Upload succeeded but no path returned`);
          throw new Error('Upload succeeded but no file path returned');
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
          
        if (!urlData || !urlData.publicUrl) {
          console.error(`Upload ${uploadId}: Failed to get public URL`);
          throw new Error('Failed to get public URL');
        }
        
        const mediaUrl = urlData.publicUrl;
        console.log(`Upload ${uploadId}: Direct client upload succeeded with URL:`, mediaUrl);
        
        // Create a synthetic media object to return since we bypassed the server API
        const syntheticMedia = {
          id: `client_${Date.now()}`,
          step_id: stepId,
          type: mediaType,
          url: mediaUrl,
          filename: file.name,
          size_bytes: file.size,
          created_at: new Date().toISOString(),
        };
        
        // Try to save the media reference through the API
        try {
          const token = await currentUser.getIdToken();
          await fetch('/api/media', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              stepId,
              mediaType,
              url: mediaUrl,
              filename: file.name,
              size: file.size
            })
          });
          console.log(`Upload ${uploadId}: Media reference saved to database`);
        } catch (saveError) {
          console.warn(`Upload ${uploadId}: Failed to save media reference (non-critical):`, saveError);
          // Continue anyway - we'll return the synthetic object
        }
        
        return syntheticMedia;
      }
    } catch (err) {
      console.error(`Upload ${uploadId}: Error uploading media:`, err);
      setError(err instanceof Error ? err.message : 'Failed to upload media');
      showError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };

  const handlePreviewSOP = () => {
    // Show toast that preview is loading
    showInfo('Loading preview...');
    
    // Add a small delay for better UX before navigating
    setTimeout(() => {
      router.push(`/sop/${id}/preview`);
    }, 300);
  };
  
  const handleResetStorage = async () => {
    if (!currentUser) return;
    
    try {
      showInfo('Resetting storage bucket...');
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/reset-storage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        showError(`Failed to reset storage: ${errorText}`);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Storage bucket reset successfully');
      } else {
        showError(`Reset failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resetting storage:', error);
      showError('Failed to reset storage: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Function to create prepopulated steps from localStorage data
  const createPrePopulatedSteps = async () => {
    if (!currentUser || !id) return;
    
    try {
      // Check if we have wizard data in localStorage
      const wizardDataJson = localStorage.getItem('sopWizardData');
      if (!wizardDataJson) return;
      
      const wizardData = JSON.parse(wizardDataJson);
      const { steps } = wizardData;
      
      if (!steps || !Array.isArray(steps) || steps.length === 0) return;
      
      // Get authentication token
      const token = await currentUser.getIdToken();
      
      // Create each step sequentially
      let createdSteps = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const newStepData: Partial<Step> = {
          sop_id: id,
          order_index: i + 1,
          instructions: step.instructions || '',
        };
        
        const createdStep = await addStep(token, newStepData);
        createdSteps.push(createdStep);
        
        // Brief delay to avoid overwhelming the server
        if (i < steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Update the steps state
      setSteps(createdSteps.sort((a, b) => a.order_index - b.order_index));
      showSuccess(`Created ${createdSteps.length} steps from your wizard session`);
      
      // Clear wizard data
      localStorage.removeItem('sopWizardData');
      
      // Scroll to the first step
      setTimeout(() => {
        if (createdSteps.length > 0) {
          const element = document.getElementById(`step-${createdSteps[0].id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 500);
      
    } catch (error) {
      console.error('Error creating prepopulated steps:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-primary-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">SOP not found. It may have been deleted.</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-primary-600 hover:text-primary-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-primary-600 hover:text-primary-800 flex items-center mr-4 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit SOP</h1>
        </div>
        
        {/* Theme selector */}
        <div className="flex items-center space-x-2">
          <label htmlFor="theme-selector" className="text-sm font-medium text-gray-700">Theme:</label>
          <select 
            id="theme-selector"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="default">Default</option>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="sunset">Sunset</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 animate-shake" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">SOP Details</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center focus:outline-none focus:underline font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-white">
          {isEditing ? (
            <form onSubmit={handleSaveSOP}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={sopTitle}
                    onChange={(e) => setSopTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={sopCategory}
                    onChange={(e) => setSopCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={sopDescription}
                    onChange={(e) => setSopDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setSopTitle(sop.title);
                      setSopCategory(sop.category || '');
                      setSopDescription(sop.description || '');
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{sop.title}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  {sop.category ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {sop.category}
                    </span>
                  ) : null}
                </div>
              </div>
              
              {sop.description && (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p>{sop.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <button 
          onClick={handlePreviewSOP}
          className="btn btn-primary inline-flex items-center px-4 py-2 gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Preview SOP
        </button>
        
        <button 
          onClick={() => {
            showInfo('SOP publishing feature coming soon...');
          }}
          className="btn btn-secondary inline-flex items-center px-4 py-2 gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Publish SOP
        </button>
        
        <div className="ml-auto">
          <button 
            onClick={handleResetStorage}
            className="btn btn-outline inline-flex items-center px-3 py-1.5 gap-2 text-sm"
            title="Reset storage bucket if uploads are failing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reset Storage
          </button>
        </div>
      </div>
      
      <div>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Procedure Steps</h2>
            <button 
              onClick={handleAddStep}
              className="btn btn-primary inline-flex items-center px-3 py-1.5 gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Step
            </button>
          </div>

          {steps.length > 0 ? (
            <div className="space-y-6">
              {steps.map((step) => (
                <div id={`step-${step.id}`} key={step.id}>
                  <StepEditor 
                    step={step} 
                    onUpdateStep={handleUpdateStep}
                    onDeleteStep={handleDeleteStep}
                    onGenerateInstructions={handleGenerateInstructions}
                    onUploadMedia={handleMediaUpload}
                  />
                </div>
              ))}
              {/* Bottom reference for scrolling */}
              <div ref={bottomRef} className="h-0 w-full invisible" aria-hidden="true" />
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Added Yet</h3>
              <p className="text-gray-600 mb-4">Start building your SOP by adding steps with instructions and media</p>
              <button 
                onClick={handleAddStep}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add First Step
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating action buttons */}
      {steps.length > 0 && (
        <div className={`fixed bottom-6 right-6 flex flex-col space-y-3 transition-transform duration-300 ${showStepNav ? 'translate-y-0' : 'translate-y-24'}`}>
          {/* Step navigation */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 max-h-64">
            <div className="p-3 bg-gray-100 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Navigate Steps</h4>
            </div>
            <div className="p-2 max-h-48 overflow-y-auto">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => scrollToStep(step.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm rounded-md flex items-center"
                >
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 inline-flex items-center justify-center text-xs font-medium mr-2">
                    {step.order_index}
                  </span>
                  <span className="truncate">{step.title || `Step ${step.order_index}`}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Add step button */}
          <button
            onClick={handleAddStep}
            className="h-14 w-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center justify-center"
            aria-label="Add Step"
            title="Add new step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
} 