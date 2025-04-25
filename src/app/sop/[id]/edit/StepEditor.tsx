import React, { useState, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { Step, Media } from '@/types/sop';
import MediaPreview from '@/components/MediaPreview';
import DropZone from '@/components/ui/DropZone';
import { debounce } from 'lodash';

interface StepEditorProps {
  step: Step;
  onUpdateStep: (id: string, data: Partial<Step>) => void;
  onDeleteStep: (id: string) => void;
  onGenerateInstructions: (stepId: string, title: string) => void;
  onUploadMedia: (stepId: string, file: File) => Promise<any>;
}

type FormValues = {
  title: string;
  instructions: string;
};

export default function StepEditor({ step, onUpdateStep, onDeleteStep, onGenerateInstructions, onUploadMedia }: StepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMediaId, setEditMediaId] = useState<string | null>(null);
  const [highlightedCaption, setHighlightedCaption] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  const { register, control, watch } = useForm<FormValues>({
    defaultValues: {
      title: step.title || '',
      instructions: step.instructions || '',
    }
  });
  
  const title = watch('title');
  const instructions = watch('instructions');
  
  // Create a debounced update function to prevent too many updates
  const debouncedUpdate = useCallback(
    debounce((field: string, value: string) => {
      onUpdateStep(step.id, { [field]: value });
    }, 800),
    [step.id, onUpdateStep]
  );
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedUpdate('title', e.target.value);
  };
  
  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedUpdate('instructions', e.target.value);
  };
  
  const handleGenerateInstructions = () => {
    if (!title) return;
    setIsGenerating(true);
    onGenerateInstructions(step.id, title);
    // The generating state is reset after the parent component handles the generation
    setTimeout(() => setIsGenerating(false), 15000); // Fallback timeout
  };
  
  const handleAddMedia = () => {
    if (mediaInputRef.current) {
      mediaInputRef.current.click();
    }
  };
  
  const handleDeleteMedia = (mediaId: string) => {
    if (step.media) {
      const updatedMedia = step.media.filter(m => m.id !== mediaId);
      onUpdateStep(step.id, { media: updatedMedia });
    }
  };
  
  const handleMediaUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Generate a unique operation ID for this upload
    const operationId = Date.now().toString(36);
    console.log(`[${operationId}] Starting upload for file: ${file.name}`);
    
    // Mock progress simulation for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);
    
    try {
      // Only pass two parameters here - stepId and file
      const uploadResult = await onUploadMedia(step.id, file);
      console.log(`[${operationId}] Upload complete:`, uploadResult);
      
      // Clear preview
      setUploadProgress(100);
      
      // Highlight the caption of the newly uploaded media
      setTimeout(() => {
        if (uploadResult && uploadResult.id) {
          setHighlightedCaption(uploadResult.id);
          
          // First ensure the caption is visible in the viewport
          const captionElement = document.getElementById(`caption-${uploadResult.id}`);
          if (captionElement) {
            captionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Clear the highlight after animation completes
            setTimeout(() => setHighlightedCaption(null), 2000);
          }
        }
      }, 100); // Small delay to ensure the DOM has updated
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error(`[${operationId}] Failed to upload media:`, error);
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };
  
  const handleMediaUploadFromInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleMediaUpload(files[0]);
    }
    // Reset input value to allow uploading same file again
    if (e.target) e.target.value = '';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleMediaUpload(files[0]);
    }
  };
  
  const handleMediaCaption = (mediaId: string, caption: string) => {
    if (step.media) {
      const updatedMedia = step.media.map(m => {
        if (m.id === mediaId) {
          return { ...m, caption };
        }
        return m;
      });
      onUpdateStep(step.id, { media: updatedMedia });
      setEditMediaId(null);
    }
  };
  
  // Don't use step.title/instructions directly as they might not reflect current input state
  // due to debouncing. Instead, use the form state
  
  return (
    <div 
      className={twMerge(
        "glass-card dark:glass-card-dark mb-6 overflow-hidden transition-shadow duration-300",
        isExpanded ? "shadow-md hover:shadow-lg" : "shadow hover:shadow-md"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="px-4 py-3 sm:px-6 border-b border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-3 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 focus:outline-none"
            aria-expanded={isExpanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-sm font-medium">
            {step.order_index}
          </span>
          <input
            type="text"
            placeholder="Enter step title..."
            defaultValue={step.title || ''}
            {...register('title', { onChange: handleTitleChange })}
            className="ml-3 text-base font-medium bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 flex-1 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        
        <div className="flex items-center">
          {step.updated_at && (
            <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 mr-4">
              {`Updated ${formatDistanceToNow(new Date(step.updated_at), { addSuffix: true })}`}
            </span>
          )}
          
          <button
            type="button"
            onClick={() => onDeleteStep(step.id)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 focus:outline-none ml-2"
            aria-label="Delete step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-6 bg-white dark:bg-slate-800">
          <div className="flex flex-col lg:flex-row lg:space-x-6">
            <div className="w-full lg:w-2/3 mb-6 lg:mb-0">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor={`instructions-${step.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Step Instructions
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateInstructions}
                    disabled={isGenerating || !title}
                    className={`inline-flex items-center text-xs px-2 py-1 rounded-md ${
                      !title 
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto-generate
                      </>
                    )}
                  </button>
                </div>
                <Controller
                  name="instructions"
                  control={control}
                  render={({ field }) => (
                    <TextareaAutosize
                      id={`instructions-${step.id}`}
                      minRows={3}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white transition-colors"
                      placeholder="Describe what to do in this step..."
                      {...field}
                      onChange={e => {
                        field.onChange(e);
                        handleInstructionsChange(e);
                      }}
                    />
                  )}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Be clear and concise. Include details about tools needed, time required, and safety considerations.
                </p>
              </div>
            </div>
            
            <div className="w-full lg:w-1/3">
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Media Files
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleAddMedia}
                    className="text-xs inline-flex items-center px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Media
                  </button>
                </div>
              </div>
              
              <input
                type="file"
                ref={mediaInputRef}
                onChange={handleMediaUploadFromInput}
                className="hidden"
                accept="image/*,video/*"
              />
              
              {isUploading && (
                <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Uploading media...</span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {(!step.media || step.media.length === 0) ? (
                <DropZone
                  onUpload={handleMediaUpload}
                  label="Drag and drop an image or video"
                  sublabel="or click to browse files"
                  accept="image/*,video/*"
                  className="h-[150px] border-dashed border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50"
                />
              ) : (
                <div className="space-y-3">
                  {step.media.map((media: Media) => (
                    <div 
                      key={media.id} 
                      className={`bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden ${
                        highlightedCaption === media.id ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
                      }`}
                    >
                      <MediaPreview media={media} />
                      
                      <div className="p-2" id={`caption-${media.id}`}>
                        {editMediaId === media.id ? (
                          <div className="flex">
                            <input
                              type="text"
                              defaultValue={media.caption || ''}
                              className="flex-1 text-xs border border-slate-300 dark:border-slate-600 rounded-l-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
                              placeholder="Add a caption..."
                              autoFocus
                              data-media-id={media.id}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleMediaCaption(media.id, (e.target as HTMLInputElement).value);
                                } else if (e.key === 'Escape') {
                                  setEditMediaId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleMediaCaption(media.id, (document.querySelector(`input[data-media-id="${media.id}"]`) as HTMLInputElement)?.value || '')}
                              className="bg-indigo-600 dark:bg-indigo-700 text-white px-2 py-1 text-xs rounded-r-md hover:bg-indigo-700 dark:hover:bg-indigo-800"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                              {media.caption || 'No caption'}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => setEditMediaId(media.id)}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMedia(media.id)}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 