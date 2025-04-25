import React, { useState } from 'react';
import CreateStepForm from './CreateStepForm';
import AIStepGenerator from './AIStepGenerator';
import StepPreview from './StepPreview';
import StepMediaUpload from './StepMediaUpload';
import { Step, Media } from '@/types/database.types';
import { toast } from 'sonner';
import { uploadStepMedia } from '@/utils/api';
import { useSupabaseAuth } from '@/utils/supabase-auth';

interface StepFormProps {
  sopId: string;
  sopTitle: string;
  sopDescription: string | null;
  currentStepIndex: number;
  onStepCreated: (newStep: Partial<Step>) => void;
  onStepsGenerated: (steps: Partial<Step>[]) => void;
  onCancel: () => void;
}

type CreationMode = 'manual' | 'ai' | 'preview';

export default function StepForm({
  sopId,
  sopTitle,
  sopDescription,
  currentStepIndex,
  onStepCreated,
  onStepsGenerated,
  onCancel,
}: StepFormProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>('manual');
  const [generatedSteps, setGeneratedSteps] = useState<Partial<Step>[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const { getToken } = useSupabaseAuth();

  const handleStepCreated = (newStep: Partial<Step>) => {
    onStepCreated(newStep);
  };

  const handleAIStepsGenerated = (steps: Array<{
    title: string;
    instructions: string;
    role?: string;
    safety_notes?: string;
    verification?: string;
    order_index: number;
  }>) => {
    // Format the steps to match the Step type
    const formattedSteps = steps.map((step, index) => ({
      title: step.title,
      instructions: step.instructions,
      role: step.role,
      safety_notes: step.safety_notes,
      verification: step.verification,
      order_index: currentStepIndex + index,
    }));

    setGeneratedSteps(formattedSteps);
    setCreationMode('preview');
  };

  const handleAddAllSteps = () => {
    if (generatedSteps.length === 0) {
      toast.error("No steps available to add");
      return;
    }

    onStepsGenerated(generatedSteps);
    toast.success(`Added ${generatedSteps.length} steps`);
  };

  const handleAddCurrentStep = () => {
    if (generatedSteps.length === 0) {
      toast.error("No step available to add");
      return;
    }

    onStepCreated(generatedSteps[previewIndex]);
    toast.success("Step added successfully");

    // Move to the next step if available
    if (previewIndex < generatedSteps.length - 1) {
      setPreviewIndex(previewIndex + 1);
    } else {
      // Reset the form after adding all steps
      setCreationMode('manual');
      setGeneratedSteps([]);
      setPreviewIndex(0);
    }
  };

  const handleMediaUpload = async (stepId: string, file: File): Promise<Media> => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return uploadStepMedia(token, stepId, file);
  };
  
  const handleMediaUploaded = (stepId: string, newMedia: Media) => {
    // This will only be used in the preview mode to update the previewed steps
    if (creationMode === 'preview' && generatedSteps.length > 0) {
      const updatedSteps = generatedSteps.map((step, index) => {
        if (index === previewIndex) {
          // Add the new media to the step
          const currentMedia = step.media || [];
          return {
            ...step,
            media: [...currentMedia, newMedia]
          };
        }
        return step;
      });
      
      setGeneratedSteps(updatedSteps);
    }
  };

  const renderModeSelector = () => (
    <div className="mb-6">
      <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
        <button
          type="button"
          className={`flex-1 py-3 px-4 text-sm font-medium 
                    ${creationMode === 'manual' 
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
          onClick={() => setCreationMode('manual')}
        >
          Manual Creation
        </button>
        <button
          type="button"
          className={`flex-1 py-3 px-4 text-sm font-medium 
                    ${creationMode === 'ai' 
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
          onClick={() => setCreationMode('ai')}
        >
          AI-Assisted Generation
        </button>
      </div>
    </div>
  );

  const renderStepPreview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Generated Steps Preview
      </h2>

      {/* Preview navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Previewing step {previewIndex + 1} of {generatedSteps.length}
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
            disabled={previewIndex === 0}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 
                      dark:hover:text-indigo-400 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Previous step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPreviewIndex(prev => Math.min(generatedSteps.length - 1, prev + 1))}
            disabled={previewIndex === generatedSteps.length - 1}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 
                      dark:hover:text-indigo-400 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Next step"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step preview */}
      {generatedSteps.length > 0 && (
        <>
          <StepPreview 
            step={generatedSteps[previewIndex]} 
            isExpanded={true}
            isActive={true}
          />
          
          {/* Add Media Upload option */}
          {generatedSteps[previewIndex].id && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
                Add Media to Step
              </h3>
              <StepMediaUpload
                stepId={generatedSteps[previewIndex].id}
                sopId={sopId}
                onMediaUploaded={(newMedia) => handleMediaUploaded(generatedSteps[previewIndex].id!, newMedia)}
                onUploadMedia={handleMediaUpload}
                className="mt-4"
              />
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => setCreationMode('ai')}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 
                    bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 
                    rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600"
        >
          Back to Generation
        </button>
        
        <button
          type="button"
          onClick={handleAddCurrentStep}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 
                    border border-transparent rounded-md shadow-sm hover:bg-green-700"
        >
          Add This Step
        </button>
        
        <button
          type="button"
          onClick={handleAddAllSteps}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 
                    border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
        >
          Add All Steps
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      {creationMode !== 'preview' && renderModeSelector()}
      
      {creationMode === 'manual' && (
        <CreateStepForm
          sopId={sopId}
          currentStepIndex={currentStepIndex}
          onSuccess={handleStepCreated}
          onCancel={onCancel}
        />
      )}
      
      {creationMode === 'ai' && (
        <AIStepGenerator
          sopId={sopId}
          sopTitle={sopTitle}
          sopDescription={sopDescription || ''}
          onStepsGenerated={handleAIStepsGenerated}
          onCancel={() => setCreationMode('manual')}
        />
      )}
      
      {creationMode === 'preview' && renderStepPreview()}
    </div>
  );
} 