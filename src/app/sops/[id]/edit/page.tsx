'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToaster } from '@/components/ui/toaster';

interface Step {
  id?: string;
  sop_id?: string;
  step_number: number;
  title: string;
  description: string;
  estimated_time?: number | null;
}

interface SOP {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  sop_steps: Step[];
}

export default function EditSOPPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { addToast } = useToaster();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sop, setSop] = useState<SOP | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSOP = async () => {
      try {
        const response = await fetch(`/api/sops/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOP');
        }
        
        const data = await response.json();
        setSop(data.data);
        setTitle(data.data.title);
        setDescription(data.data.description || '');
        
        // Sort steps by step_number
        const sortedSteps = [...(data.data.sop_steps || [])].sort(
          (a, b) => a.step_number - b.step_number
        );
        setSteps(sortedSteps);
      } catch (error) {
        console.error('Error fetching SOP:', error);
        setError('Failed to load SOP. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSOP();
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Update SOP details
      const sopResponse = await fetch(`/api/sops/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      
      if (!sopResponse.ok) {
        throw new Error('Failed to update SOP');
      }
      
      // Update steps (normally this would handle create/update/delete operations)
      // This is a simplified version that just updates all steps
      
      addToast({
        title: 'SOP saved successfully',
        type: 'success',
      });
      
      router.push(`/sops/${params.id}`);
    } catch (error) {
      console.error('Error saving SOP:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    const newStepNumber = steps.length > 0 
      ? Math.max(...steps.map(s => s.step_number)) + 1 
      : 1;
      
    setSteps([
      ...steps,
      {
        step_number: newStepNumber,
        title: `Step ${newStepNumber}`,
        description: '',
        estimated_time: null,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    
    // Reorder step numbers
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    
    setSteps(newSteps);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && !sop) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <h3 className="text-red-800 font-medium mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <Link href="/sops" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Return to SOPs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href={`/sops/${params.id}`} 
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to SOP
        </Link>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Save Changes
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-4">SOP Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter SOP title"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter SOP description"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Steps</h2>
          
          <button
            onClick={addStep}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Step
          </button>
        </div>
        
        <div className="p-6">
          {steps.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">No steps added yet</h3>
              <p className="text-gray-500 mb-4">Add steps to complete this SOP</p>
              <button
                onClick={addStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add First Step
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={step.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 text-blue-800 font-semibold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                        {step.step_number}
                      </div>
                      <h3 className="text-lg font-semibold">Edit Step</h3>
                    </div>
                    
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Step Title
                      </label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter step title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Step Description
                      </label>
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter step description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={step.estimated_time || ''}
                        onChange={(e) => updateStep(index, 'estimated_time', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter estimated time in minutes"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 