"use client";

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { SOP } from '@/types/database.types';
import { createSOP } from '@/utils/api';
import SOPWizard from '@/components/SOPWizard';
import { withDatabaseFix } from '@/utils/fix-database';
import { useToast } from '@/contexts/ToastContext';

// Predefined categories to choose from
const SUGGESTED_CATEGORIES = [
  'Equipment Operation',
  'Safety Procedures',
  'Maintenance',
  'Customer Service',
  'Administrative',
  'Quality Control',
  'Training',
  'Other'
];

export default function CreateSopPage() {
  const { user, isLoading, isAuthenticated, getToken } = useAuthContext();
  const router = useRouter();
  const { showToast } = useToast();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState({
    title: '',
    category: ''
  });
  const [showWizard, setShowWizard] = useState(false);

  // Check authentication on mount - redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      const currentPath = encodeURIComponent('/sop/create');
      router.push(`/auth/signin?redirectTo=${currentPath}`);
    }
  }, [isAuthenticated, isLoading, router]);

  // Form validation
  const validateForm = () => {
    let valid = true;
    const errors = { title: '', category: '' };

    if (!title.trim()) {
      errors.title = 'Title is required';
      valid = false;
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
      valid = false;
    }

    const effectiveCategory = category === 'custom' ? customCategory : category;
    if (!effectiveCategory.trim()) {
      errors.category = 'Category is required';
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      setError('You must be logged in to create an SOP.');
      router.push(`/auth/signin?redirectTo=${encodeURIComponent('/sop/create')}`);
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Get authentication token
      const token = await getToken();
      
      if (!token) {
        throw new Error('Unable to authenticate. Please sign in again.');
      }
      
      const effectiveCategory = category === 'custom' ? customCategory : category;
      const newSopData = { 
        title, 
        description, 
        category: effectiveCategory,
        status: 'draft' as const
      };
      
      console.log('Creating SOP with data:', JSON.stringify(newSopData));
      
      // Create the SOP with database fix fallback
      const createSopWithFix = async () => {
        return await createSOP(token, newSopData);
      };
      
      const createdSop = await withDatabaseFix(createSopWithFix);
      
      // Show success message
      showToast('SOP created successfully', 'success');
      
      // Redirect to edit page
      router.push(`/sop/${createdSop.id}/edit`);
    } catch (err) {
      console.error('Error creating SOP:', err);
      setError(err instanceof Error ? err.message : 'Failed to create SOP. Please try again.');
      showToast('Failed to create SOP', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle wizard completion
  const handleWizardComplete = async (sopData: Partial<SOP>, steps: any[] = []) => {
    if (!isAuthenticated || !user) {
      setError('You must be logged in to create an SOP.');
      setShowWizard(false);
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('Unable to authenticate. Please sign in again.');
      }
      
      // Create the SOP first
      const effectiveCategory = sopData.category || '';
      const newSopData = { 
        title: sopData.title || 'Untitled SOP',
        description: sopData.description || '',
        category: effectiveCategory,
        status: 'draft' as const
      };
      
      console.log('Creating SOP with data:', JSON.stringify(newSopData));
      
      // Create SOP with database fix fallback
      const createSopWithFix = async () => {
        return await createSOP(token, newSopData);
      };
      
      const createdSop = await withDatabaseFix(createSopWithFix);
      
      // Show success message
      showToast('SOP created successfully', 'success');
      
      // Now navigate to the edit page where steps will be created
      router.push(`/sop/${createdSop.id}/edit?prepopulate=true`);
    } catch (err) {
      console.error('Error creating SOP from wizard:', err);
      setError(err instanceof Error ? err.message : 'Failed to create SOP from wizard');
      showToast('Failed to create SOP', 'error');
    } finally {
      setIsSubmitting(false);
      setShowWizard(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-primary-600 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, the useEffect will handle redirect
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => router.back()}
          className="text-primary-600 hover:text-primary-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New SOP</h1>
              <p className="mt-1 text-sm text-gray-600">
                Add basic information about your Standard Operating Procedure
              </p>
            </div>
            
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              AI-Guided Creation
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              SOP Title <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`block w-full px-4 py-3 rounded-lg border ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              placeholder="e.g., How to Operate the Coffee Machine"
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Use a clear, descriptive title that explains what this procedure is about
            </p>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Provide a brief summary of this SOP's purpose and when it should be used"
            />
            <p className="mt-1 text-xs text-gray-500">
              A good description helps others understand when and why to use this procedure
            </p>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`block w-full px-4 py-3 rounded-lg border ${
                formErrors.category ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            >
              <option value="">Select a Category</option>
              {SUGGESTED_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="custom">Custom Category</option>
            </select>

            {category === 'custom' && (
              <div className="mt-3">
                <label htmlFor="customCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Category
                </label>
                <input
                  type="text"
                  id="customCategory"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={`block w-full px-4 py-3 rounded-lg border ${
                    formErrors.category ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Enter a custom category"
                />
              </div>
            )}

            {formErrors.category && (
              <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Categorizing SOPs helps with organization and discovery
            </p>
          </div>
          
          <div className="pt-4 flex justify-between border-t border-gray-200">
            <div className="text-sm text-gray-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span>
                Don&apos;t know where to start? Try the <button 
                  type="button" 
                  className="text-purple-600 hover:text-purple-800 font-medium underline"
                  onClick={() => setShowWizard(true)}
                >
                  AI Wizard
                </button>
              </span>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Continue to Add Steps'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* AI-Guided SOP Wizard */}
      <SOPWizard 
        isOpen={showWizard}
        onCancel={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}