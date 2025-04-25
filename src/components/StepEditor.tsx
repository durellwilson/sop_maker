"use client";

import { useState, useRef, DragEvent, useEffect } from 'react';
import { Step, MediaType } from '@/types/database.types';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface StepEditorProps {
  step: Step;
  onUpdateStep: (stepId: string, updates: Partial<Step>) => Promise<Step>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onGenerateInstructions: (stepId: string, prompt: string) => Promise<void>;
  onUploadMedia: (stepId: string, file: File) => Promise<any>;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveStep?: (stepId: string, direction: 'up' | 'down') => Promise<void>;
  totalSteps?: number;
}

interface PreviewMedia {
  file: File;
  preview: string;
  type?: string;
  thumbnail?: string;
}

// Zod schema for validation
const stepSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  role: z.string().optional(),
  safety_notes: z.string().optional(),
  verification: z.string().optional(),
});

export type StepFormData = z.infer<typeof stepSchema>;

export default function StepEditor({
  step,
  onUpdateStep,
  onDeleteStep,
  onGenerateInstructions,
  onUploadMedia,
  isFirst = false,
  isLast = false,
  onMoveStep,
  totalSteps = 1
}: StepEditorProps) {
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset } = useForm<StepFormData>({
    defaultValues: {
      title: step.title || '',
      instructions: step.instructions || '',
      role: step.role || '',
      safety_notes: step.safety_notes || '',
      verification: step.verification || '',
    }
  });

  const [instruction, setInstruction] = useState(step.instructions || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaType[]>(step.media || []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);
  const uniqueId = `step-${step.id}`;
  
  // Collapsible state for media section
  const [mediaExpanded, setMediaExpanded] = useState(true);

  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstruction(e.target.value);
  };
  
  const handleSaveInstruction = async () => {
    if (instruction.trim() === (step.instructions || '').trim()) return;
    
    setIsSaving(true);
    try {
      await onUpdateStep(step.id, { instructions: instruction });
      toast.success('Instructions saved successfully');
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast.error('Failed to save instructions');
      instructionRef.current?.focus();
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInstructions = async () => {
    setIsGenerating(true);
    displayInfoMessage('Generating instructions using AI...');
    try {
      await onGenerateInstructions(step.id, instruction);
      displaySuccessMessage('AI instructions generated successfully');
    } catch (error) {
      displayErrorMessage('Failed to generate instructions');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const processFile = (file: File) => {
    // Create preview URL for the file
    const url = URL.createObjectURL(file);
    
    if (file.type.startsWith('video/')) {
      // For videos, generate a thumbnail
      setPreviewMedia({ 
        file, 
        preview: url,
        type: 'video',
      });
      
      // Generate video thumbnail
      generateVideoThumbnail(file, url);
    } else {
      setPreviewMedia({ file, preview: url });
    }
  };

  // Function to generate video thumbnail
  const generateVideoThumbnail = (file: File, videoUrl: string) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    // Get thumbnail once video metadata is loaded
    video.onloadedmetadata = () => {
      // Set video to a frame at the 0.25 mark (25% through the video)
      video.currentTime = Math.min(video.duration * 0.25, 5);
      
      video.onseeked = () => {
        try {
          // Create a canvas element
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw the video frame to the canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get the thumbnail as a data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Update the preview media with the thumbnail
            setPreviewMedia(prev => {
              if (prev) {
                return {
                  ...prev,
                  thumbnail: thumbnailUrl
                };
              }
              return null;
            });
          }
        } catch (e) {
          console.error('Error generating thumbnail:', e);
        }
      };
    };
    
    video.onerror = () => {
      console.error('Error loading video for thumbnail generation');
    };
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        processFile(file);
        void handleFileUpload(file);
      } else {
        setUploadError('Unsupported file type. Please use images or videos.');
        toast.error('Unsupported file type. Please use images or videos.');
      }
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      processFile(file);
      void handleFileUpload(file);
    } else {
      setUploadError('Unsupported file type. Please use images or videos.');
      toast.error('Unsupported file type. Please use images or videos.');
    }
  };
  
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    // Generate a unique operation ID for tracking this upload in logs
    const operationId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[${operationId}] Starting file upload:`, file.name, file.type, file.size);
    
    try {
      // Show optimistic UI - create a preview immediately
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setPreviewMedia({
          file,
          preview: previewUrl,
          type: 'image'
        });
        console.log(`[${operationId}] Created preview for image`);
      }
      
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      console.log(`[${operationId}] Determined media type:`, mediaType);
      
      toast.info(`Uploading ${file.name}...`);
      
      // Maximum retry count
      const MAX_RETRIES = 2;
      let retryCount = 0;
      let error = null;
      
      // Retry loop for upload attempts
      while (retryCount <= MAX_RETRIES) {
        try {
          console.log(`[${operationId}] Upload attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);
          
          const uploadedMedia = await onUploadMedia(step.id, file);
          console.log(`[${operationId}] Upload successful:`, uploadedMedia);
          
          // Clear the temporary preview
          if (previewMedia) {
            URL.revokeObjectURL(previewMedia.preview);
            setPreviewMedia(null);
          }
          
          // Check if we received a valid media object from the server
          if (uploadedMedia) {
            console.log(`[${operationId}] Adding uploaded media to step:`, uploadedMedia);
            toast.success('Media uploaded successfully');
            
            // Use media received from the server
            const currentMedia = step.media || [];
            const updatedMedia = [...currentMedia, uploadedMedia];
            
            // Update the local step state with the new media
            try {
              // Add a small delay to avoid race conditions
              await new Promise(resolve => setTimeout(resolve, 300));
              const updatedStep = await onUpdateStep(step.id, { media: updatedMedia });
              console.log(`[${operationId}] Step updated with new media:`, updatedStep);
              return updatedMedia; // Return the updated media array
            } catch (updateError) {
              console.error(`[${operationId}] Error updating step with new media:`, updateError);
              toast.info('Media uploaded but failed to update step - will appear after refresh');
              // Still consider this a success even if step update fails
            }
            
            return uploadedMedia; // Successfully uploaded
          } else {
            console.warn(`[${operationId}] No media returned from upload`);
            throw new Error('Server returned no media data');
          }
        } catch (uploadError) {
          error = uploadError;
          console.error(`[${operationId}] Attempt ${retryCount + 1} failed:`, uploadError);
          
          if (retryCount < MAX_RETRIES) {
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[${operationId}] Retrying in ${delay}ms...`);
            toast.info(`Upload attempt failed. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
          } else {
            console.error(`[${operationId}] All ${MAX_RETRIES + 1} attempts failed.`);
            break; // Exit retry loop
          }
        }
      }
      
      // If we get here, all upload attempts failed
      throw error || new Error('Failed to upload after multiple attempts');
    } catch (error) {
      console.error(`[${operationId}] Error uploading file:`, error);
      console.error(`[${operationId}] Error details:`, error instanceof Error ? error.message : 'Unknown error');
      
      let errorMessage = 'Failed to upload media';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Categorize error for better user feedback
        if (errorMsg.includes('bucket')) {
          errorMessage = 'Storage error: The media storage is not configured correctly';
        } else if (errorMsg.includes('too large') || errorMsg.includes('size')) {
          errorMessage = 'File is too large. Please upload a smaller file';
        } else if (errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again';
        } else if (errorMsg.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try a smaller file or check your connection';
        } else if (errorMsg.includes('response') || errorMsg.includes('parse')) {
          errorMessage = 'Server returned an invalid response. Please try again';
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
          errorMessage = 'Authorization error. Please log in again';
        } else if (errorMsg.includes('format') || errorMsg.includes('invalid file')) {
          errorMessage = 'Unsupported file format. Please try a different file';
        } else if (errorMsg.includes('no media') || errorMsg.includes('missing media')) {
          errorMessage = 'Upload was processed but media data was not returned. The file may appear after refreshing.';
        } else {
          errorMessage = `Upload error: ${error.message}`;
        }
      }
      
      setUploadError(errorMessage);
      toast.error(errorMessage);
      
      // Clear preview on error only if not an authorization or server error
      // This allows the user to still see their selected image
      if (error instanceof Error && 
          !(error.message.toLowerCase().includes('unauthorized') || 
            error.message.toLowerCase().includes('401') ||
            error.message.toLowerCase().includes('server'))) {
        if (previewMedia) {
          URL.revokeObjectURL(previewMedia.preview);
          setPreviewMedia(null);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteStep = async () => {
    try {
      await onDeleteStep(step.id);
      toast.success('Step deleted successfully');
    } catch (error) {
      toast.error('Failed to delete step');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      // Show optimistic UI by removing the media from local state first
      const updatedMedia = step.media?.filter(m => m.id !== mediaId) || [];
      await onUpdateStep(step.id, { media: updatedMedia });
      toast.success('Media removed successfully');
    } catch (error) {
      console.error('Error removing media:', error);
      
      // If the first attempt fails, try again after a short delay
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedMedia = step.media?.filter(m => m.id !== mediaId) || [];
        await onUpdateStep(step.id, { media: updatedMedia });
        toast.success('Media removed successfully');
      } catch (retryError) {
        console.error('Error on retry:', retryError);
        toast.error('Failed to remove media. Please try again.');
      }
    }
  };

  // Add these local wrapper functions near the beginning of the component
  const displaySuccessMessage = (message: string) => {
    toast.success(message);
  };

  const displayErrorMessage = (message: string) => {
    toast.error(message);
  };

  const displayInfoMessage = (message: string) => {
    toast.info(message);
  };

  useEffect(() => {
    // Reset the form when the step changes
    reset({
      title: step.title || '',
      instructions: step.instructions || '',
      role: step.role || '',
      safety_notes: step.safety_notes || '',
      verification: step.verification || '',
    });
    
    // Update the media state
    setMedia(step.media || []);
  }, [step, reset]);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden mb-6">
      <div className="bg-gray-100 px-6 py-3 border-b border-gray-300 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm mr-3">
              {step.order_index}
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              Step {step.order_index}
              {totalSteps > 1 && <span className="text-gray-500 font-normal text-sm ml-2">of {totalSteps}</span>}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Step reordering controls */}
            {onMoveStep && (
              <div className="flex items-center mr-2">
                <button
                  onClick={() => onMoveStep(step.id, 'up')}
                  disabled={isFirst}
                  className={`p-1.5 rounded-md ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'}`}
                  title="Move step up"
                  aria-label="Move step up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => onMoveStep(step.id, 'down')}
                  disabled={isLast}
                  className={`p-1.5 rounded-md ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'}`}
                  title="Move step down"
                  aria-label="Move step down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-600 hover:text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-3 py-1.5 transition-colors font-medium"
              aria-label={`Delete step ${step.order_index}`}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete
              </span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <label htmlFor={`instruction-${uniqueId}`} className="block text-sm font-medium text-gray-800 mb-2">
            Instructions
          </label>
          <div className="relative bg-white rounded-lg p-1 shadow-sm border border-gray-300">
            <textarea
              id={`instruction-${uniqueId}`}
              ref={instructionRef}
              value={instruction}
              onChange={handleInstructionChange}
              onBlur={handleSaveInstruction}
              rows={4}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${showSaveSuccess ? 'border-green-500 ring-2 ring-green-200' : ''}`}
              placeholder="Enter instructions for this step..."
              name={`instruction-${uniqueId}`}
            />
            {showSaveSuccess && (
              <div className="absolute right-3 top-3 text-green-600 animate-pulse-success">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <button 
            onClick={handleGenerateInstructions}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 20.25h-15a1.5 1.5 0 01-1.5-1.5v-8.25a1.5 1.5 0 011.5-1.5h15a1.5 1.5 0 011.5 1.5v8.25a1.5 1.5 0 01-1.5 1.5z" />
                </svg>
                Generate with AI
              </>
            )}
          </button>
          <button 
            onClick={handleSaveInstruction}
            disabled={isSaving || instruction.trim() === (step.instructions || '').trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
                </svg>
                Save Instructions
              </>
            )}
          </button>
        </div>
        
        {/* Collapsible media section */}
        <div>
          <div className="border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setMediaExpanded(!mediaExpanded)}
              className="flex w-full items-center justify-between text-left focus:outline-none"
            >
              <span className="text-base font-medium text-gray-800">Media Attachments</span>
              <span className="ml-4">
                {mediaExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </span>
            </button>
            
            {mediaExpanded && (
              <div className="mt-4 transition-all duration-300" style={{ maxHeight: mediaExpanded ? '2000px' : '0' }}>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 ${dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : uploadError ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 bg-white'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  aria-describedby={uploadError ? `upload-error-${uniqueId}` : undefined}
                >
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        {dragActive ? "Drop your file here" : "Drag and drop files here, or"}
                      </p>
                      <button
                        type="button"
                        onClick={handleButtonClick}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Choose File
                          </span>
                        )}
                      </button>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      id={`file-upload-${uniqueId}`}
                      name={`file-upload-${uniqueId}`}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                      aria-label="Upload media file"
                    />
                    
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF, MP4 up to 10MB
                    </p>
                  </div>
                  
                  {uploadError && (
                    <div 
                      id={`upload-error-${uniqueId}`}
                      className="mt-3 text-center text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-2 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      {uploadError}
                    </div>
                  )}
                  
                  {isUploading && !previewMedia && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="mr-3 flex-shrink-0">
                          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800">Uploading your file...</p>
                          <p className="text-xs text-blue-600">This may take a moment depending on file size</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Preview for file being uploaded */}
                  {previewMedia && (
                    <div className="mt-4 mx-auto max-w-sm">
                      <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {isUploading && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
                            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                          </div>
                        )}
                        
                        {previewMedia.file.type.startsWith('image/') ? (
                          <img 
                            src={previewMedia.preview} 
                            alt="Upload preview" 
                            className="w-full h-auto max-h-48 object-contain p-2"
                          />
                        ) : (
                          <video 
                            src={previewMedia.preview} 
                            controls 
                            className="w-full h-auto max-h-48 object-contain p-2"
                          />
                        )}
                        
                        <div className="p-3 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 pr-3">
                              <p className="text-sm font-medium text-gray-900 truncate">{previewMedia.file.name}</p>
                              <p className="text-xs text-gray-500">{(previewMedia.file.size / 1024).toFixed(1)} KB</p>
                              
                              {isUploading && (
                                <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                              )}
                            </div>
                            
                            <button 
                              onClick={() => {
                                URL.revokeObjectURL(previewMedia.preview);
                                setPreviewMedia(null);
                              }}
                              className="flex-shrink-0 p-1 rounded-full bg-white shadow hover:bg-red-100 transition-colors"
                              disabled={isUploading}
                              aria-label="Remove preview"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Display existing media, if any */}
                  {step.media && step.media.length > 0 && (
                    <div className="mt-6 animate-slide-up">
                      <h4 className="font-medium text-sm text-gray-800 mb-2">Attached Media</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {step.media.map((media) => {
                          // Track local caption state for better UX
                          const [localCaption, setLocalCaption] = useState(media.caption || '');
                          const [isSaving, setIsSaving] = useState(false);
                          const [showSuccess, setShowSuccess] = useState(false);
                          
                          const saveCaption = async () => {
                            if (localCaption === media.caption) return;
                            setIsSaving(true);
                            
                            try {
                              // Create updated media array with new caption
                              const updatedMedia = [...(step.media || [])].map(m => 
                                m.id === media.id ? {...m, caption: localCaption} : m
                              );
                              
                              // Update the step with new media
                              const updatedStep = await onUpdateStep(step.id, { media: updatedMedia });
                              
                              // Also update the local media object to reflect the change immediately
                              // This ensures the caption is updated in the backend
                              media.caption = localCaption;
                              
                              setShowSuccess(true);
                              setTimeout(() => setShowSuccess(false), 2000);
                            } catch (error) {
                              console.error('Failed to update caption:', error);
                              toast.error('Failed to save caption');
                            } finally {
                              setIsSaving(false);
                            }
                          };
                          
                          return (
                            <div key={media.id} className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                              <div className="relative">
                                {media.type === 'image' ? (
                                  <div className="bg-gray-100 flex items-center justify-center">
                                    <img 
                                      src={media.url} 
                                      alt={media.caption || `Media for step ${step.order_index}`} 
                                      id={`media-img-${media.id}`}
                                      className={`w-full h-48 ${media.display_mode === 'cover' ? 'object-cover' : 'object-contain'}`}
                                      style={{ objectFit: media.display_mode === 'cover' ? 'cover' : 'contain' }}
                                    />
                                    <div className="absolute bottom-3 right-3 flex space-x-2">
                                      <button 
                                        onClick={async () => {
                                          const img = document.getElementById(`media-img-${media.id}`) as HTMLImageElement;
                                          if (img) {
                                            // Determine new display mode
                                            const newDisplayMode = img.style.objectFit === 'cover' || media.display_mode === 'cover' 
                                              ? 'contain' as const
                                              : 'cover' as const;
                                            
                                            // Update local display
                                            img.style.objectFit = newDisplayMode;
                                            if (newDisplayMode === 'cover') {
                                              img.classList.remove('object-contain');
                                              img.classList.add('object-cover');
                                            } else {
                                              img.classList.remove('object-cover');
                                              img.classList.add('object-contain');
                                            }
                                            
                                            // Save the display mode to the media object
                                            const updatedMedia = [...(step.media || [])].map(m => 
                                              m.id === media.id ? {...m, display_mode: newDisplayMode} : m
                                            );
                                            
                                            // Update the step with new media
                                            try {
                                              await onUpdateStep(step.id, { media: updatedMedia });
                                              displaySuccessMessage('Display mode saved');
                                            } catch (error) {
                                              console.error('Failed to save display mode:', error);
                                              displayErrorMessage('Failed to save display preference');
                                            }
                                          }
                                        }}
                                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Toggle fit mode"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ) : media.type === 'video' ? (
                                  <div className="bg-gray-100 flex items-center justify-center">
                                    <video 
                                      src={media.url} 
                                      className="w-full h-48 object-contain"
                                      preload="metadata"
                                      controls
                                    />
                                    
                                    {/* Video thumbnail controls */}
                                    <div className="absolute bottom-3 right-3 flex space-x-2">
                                      <button 
                                        onClick={() => {
                                          // Generate a thumbnail from the video
                                          const video = document.createElement('video');
                                          video.src = media.url;
                                          video.crossOrigin = 'anonymous';
                                          video.preload = 'metadata';
                                          
                                          toast.info('Generating thumbnail...');
                                          
                                          video.onloadedmetadata = () => {
                                            // Set video to the first frame
                                            video.currentTime = Math.min(video.duration * 0.25, 5);
                                            
                                            video.onseeked = async () => {
                                              try {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = video.videoWidth;
                                                canvas.height = video.videoHeight;
                                                
                                                const ctx = canvas.getContext('2d');
                                                if (ctx) {
                                                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                                  
                                                  // Convert the canvas to a Blob
                                                  canvas.toBlob(async (blob) => {
                                                    if (blob) {
                                                      // Create a file from the blob
                                                      const thumbnailFile = new File([blob], `thumbnail_${media.id}.jpg`, { type: 'image/jpeg' });
                                                      
                                                      // Upload the thumbnail
                                                      try {
                                                        const thumbnailMedia = await onUploadMedia(step.id, thumbnailFile);
                                                        if (thumbnailMedia) {
                                                          displaySuccessMessage('Thumbnail generated and saved');
                                                        }
                                                      } catch (error) {
                                                        console.error('Error uploading thumbnail:', error);
                                                        displayErrorMessage('Failed to save thumbnail');
                                                      }
                                                    }
                                                  }, 'image/jpeg', 0.8);
                                                }
                                              } catch (e) {
                                                console.error('Error generating thumbnail:', e);
                                                displayErrorMessage('Failed to generate thumbnail');
                                              }
                                            };
                                          };
                                          
                                          video.onerror = () => {
                                            console.error('Error loading video for thumbnail');
                                            displayErrorMessage('Failed to load video for thumbnail');
                                          };
                                        }}
                                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Generate thumbnail from video"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-500">Unsupported media type</span>
                                  </div>
                                )}
                                
                                <button 
                                  onClick={() => handleDeleteMedia(media.id)}
                                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  title="Remove media"
                                  aria-label={`Remove media from step ${step.order_index}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* Improved caption editor with save button */}
                              <div className="p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Caption
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={localCaption}
                                    onChange={(e) => setLocalCaption(e.target.value)}
                                    placeholder="Add a description..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    aria-label={`Caption for media ${media.id}`}
                                  />
                                  <button
                                    onClick={saveCaption}
                                    disabled={isSaving || localCaption === media.caption}
                                    className={`px-3 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                      isSaving || localCaption === media.caption
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {isSaving ? (
                                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : showSuccess ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      "Save"
                                    )}
                                  </button>
                                </div>
                                {showSuccess && (
                                  <p className="mt-1 text-sm text-green-600 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Caption saved
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Step navigation controls - mobile friendly sticky footer */}
      <div className="sticky bottom-0 border-t border-gray-200 p-3 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center space-x-1">
          {!isFirst && onMoveStep && (
            <button
              onClick={() => onMoveStep(step.id, 'up')}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              title="Previous step"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
        
        <div>
          <span className="text-sm font-medium text-gray-600">
            Step {step.order_index} of {totalSteps}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {!isLast && onMoveStep && (
            <button
              onClick={() => onMoveStep(step.id, 'down')}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              title="Next step"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Step"
        message={`Are you sure you want to delete Step ${step.order_index}? This action cannot be undone and all associated media will be permanently removed.`}
        confirmText="Delete Step"
        cancelText="Cancel"
        onConfirm={handleDeleteStep}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
      />
    </div>
  );
} 