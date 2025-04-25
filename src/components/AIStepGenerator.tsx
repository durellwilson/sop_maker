import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';
import { useSupabaseAuth } from '@/utils/supabase-auth';
import { toast } from 'sonner';

interface AIStepGeneratorProps {
  sopId: string;
  sopTitle: string;
  sopDescription: string;
  onStepsGenerated: (steps: Array<{
    title: string;
    instructions: string;
    role?: string;
    safety_notes?: string;
    verification?: string;
    order_index: number;
  }>) => void;
  onCancel: () => void;
}

export default function AIStepGenerator({
  sopId,
  sopTitle,
  sopDescription,
  onStepsGenerated,
  onCancel
}: AIStepGeneratorProps) {
  const { user, getToken } = useSupabaseAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  
  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      additionalContext: ''
    }
  });
  
  const generateDefaultPrompt = () => {
    return `Generate steps for a Standard Operating Procedure titled "${sopTitle}". 
${sopDescription ? `Description: ${sopDescription}` : ''}
Include step titles, detailed instructions, and where appropriate, safety notes and verification steps.`;
  };
  
  const handlePromptGeneration = () => {
    setGenerationPrompt(generateDefaultPrompt());
  };
  
  const onSubmit = async (data: { additionalContext: string }) => {
    if (!user) {
      toast.error("You must be logged in to generate steps");
      return;
    }
    
    if (!generationPrompt && !data.additionalContext) {
      toast.error("Please provide information for step generation");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication token not available");
      }
      
      const finalPrompt = data.additionalContext 
        ? `${generationPrompt}\n\nAdditional context: ${data.additionalContext}` 
        : generationPrompt;
      
      // Call the backend AI generation API
      const response = await fetch('/api/ai/generate-steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sop_id: sopId,
          prompt: finalPrompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate steps");
      }
      
      const { steps } = await response.json();
      
      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        throw new Error("No steps were generated. Please try again with more specific instructions.");
      }
      
      // Format the steps with order index
      const formattedSteps = steps.map((step, index) => ({
        ...step,
        order_index: index
      }));
      
      toast.success(`Generated ${steps.length} steps successfully`);
      onStepsGenerated(formattedSteps);
    } catch (error) {
      console.error("Error generating steps:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate steps");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        AI-Assisted Step Generation
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Generation Prompt Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Generation Prompt
            </label>
            
            <button
              type="button"
              onClick={handlePromptGeneration}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Generate Default Prompt
            </button>
          </div>
          
          <TextareaAutosize
            value={generationPrompt}
            onChange={(e) => setGenerationPrompt(e.target.value)}
            minRows={4}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                    rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                    placeholder-slate-400 dark:placeholder-slate-500 resize-none"
            placeholder="Define how the AI should generate steps for your SOP..."
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Define what steps should be included in this SOP. The more specific you are, the better the results.
          </p>
        </div>
        
        {/* Additional Context */}
        <div>
          <label 
            htmlFor="additionalContext" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Additional Context (Optional)
          </label>
          
          <Controller
            name="additionalContext"
            control={control}
            render={({ field }) => (
              <TextareaAutosize
                id="additionalContext"
                {...field}
                minRows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                          rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                          placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                placeholder="Provide any additional context or requirements for the steps..."
              />
            )}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add any specific details, industry standards, or requirements that should be incorporated.
          </p>
        </div>
        
        {/* Smart Suggestions */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md">
          <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">Smart Suggestions</h3>
          <ul className="space-y-1 text-xs text-indigo-700 dark:text-indigo-400">
            <li className="flex items-start">
              <span className="inline-block w-4 h-4 mr-2 mt-0.5 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              Include safety requirements for each step where applicable
            </li>
            <li className="flex items-start">
              <span className="inline-block w-4 h-4 mr-2 mt-0.5 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              Specify roles responsible for each step
            </li>
            <li className="flex items-start">
              <span className="inline-block w-4 h-4 mr-2 mt-0.5 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              Add verification methods to confirm each step was completed correctly
            </li>
            <li className="flex items-start">
              <span className="inline-block w-4 h-4 mr-2 mt-0.5 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              Mention any required equipment or tools in the instructions
            </li>
          </ul>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 
                    bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 
                    rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            disabled={isGenerating}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 
                    border border-transparent rounded-md shadow-sm 
                    hover:bg-indigo-700 focus:outline-none focus:ring-2 
                    focus:ring-indigo-500 focus:ring-offset-2 
                    disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Steps...
              </span>
            ) : 'Generate Steps'}
          </button>
        </div>
      </form>
    </div>
  );
} 