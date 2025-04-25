import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextareaAutosize from 'react-textarea-autosize';
import { useSupabaseAuth } from '@/utils/supabase-auth';
import { addStep } from '@/utils/api';
import { toast } from 'sonner';

// Define schema for validation
const stepSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  role: z.string().optional(),
  safety_notes: z.string().optional(),
  verification: z.string().optional(),
  order_index: z.number().int().min(0)
});

type StepFormValues = z.infer<typeof stepSchema>;

interface CreateStepFormProps {
  sopId: string;
  currentStepIndex: number;
  onSuccess: (newStep: any) => void;
  onCancel: () => void;
}

export default function CreateStepForm({ 
  sopId, 
  currentStepIndex,
  onSuccess, 
  onCancel 
}: CreateStepFormProps) {
  const { user, getToken } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    control, 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<StepFormValues>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      title: '',
      instructions: '',
      role: '',
      safety_notes: '',
      verification: '',
      order_index: currentStepIndex
    }
  });
  
  const onSubmit = async (data: StepFormValues) => {
    if (!user) {
      toast.error("You must be logged in to create steps");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication token not available");
      }
      
      // Submit to the API
      const newStep = await addStep(token, {
        sop_id: sopId,
        title: data.title,
        instructions: data.instructions,
        role: data.role || undefined,
        safety_notes: data.safety_notes || undefined,
        verification: data.verification || undefined,
        order_index: data.order_index
      });
      
      toast.success("Step created successfully");
      onSuccess(newStep);
    } catch (error) {
      console.error("Error creating step:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create step. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        Create New Step
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step Title */}
        <div>
          <label 
            htmlFor="title" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Step Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                      rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                      placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Enter step title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-rose-500">{errors.title.message}</p>
          )}
        </div>
        
        {/* Step Instructions */}
        <div>
          <label 
            htmlFor="instructions" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Instructions <span className="text-rose-500">*</span>
          </label>
          <Controller
            name="instructions"
            control={control}
            render={({ field }) => (
              <TextareaAutosize
                id="instructions"
                {...field}
                minRows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                          rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                          placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                placeholder="Enter detailed step instructions..."
              />
            )}
          />
          {errors.instructions && (
            <p className="mt-1 text-sm text-rose-500">{errors.instructions.message}</p>
          )}
        </div>
        
        {/* Role Assignment */}
        <div>
          <label 
            htmlFor="role" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Role (Optional)
          </label>
          <input
            id="role"
            type="text"
            {...register('role')}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                      rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                      placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Who should perform this step?"
          />
        </div>
        
        {/* Safety Notes */}
        <div>
          <label 
            htmlFor="safety_notes" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Safety Notes (Optional)
          </label>
          <Controller
            name="safety_notes"
            control={control}
            render={({ field }) => (
              <TextareaAutosize
                id="safety_notes"
                {...field}
                minRows={2}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                          rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                          placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                placeholder="Any safety considerations for this step..."
              />
            )}
          />
        </div>
        
        {/* Verification Requirements */}
        <div>
          <label 
            htmlFor="verification" 
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Verification (Optional)
          </label>
          <Controller
            name="verification"
            control={control}
            render={({ field }) => (
              <TextareaAutosize
                id="verification"
                {...field}
                minRows={2}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 
                          rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                          placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                placeholder="How to verify this step was completed correctly..."
              />
            )}
          />
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Step'}
          </button>
        </div>
      </form>
    </div>
  );
} 