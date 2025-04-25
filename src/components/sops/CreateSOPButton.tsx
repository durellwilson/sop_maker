'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { useSupabaseAuth } from '@/utils/supabase-auth';
import { toast } from 'sonner';

type CreateSOPButtonProps = {
  variant?: 'primary' | 'secondary';
};

export default function CreateSOPButton({ variant = 'secondary' }: CreateSOPButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated } = useAuthContext();
  const { getToken } = useSupabaseAuth();
  
  const handleCreateSOP = async () => {
    setIsCreating(true);
    
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        // Redirect to login
        router.push('/auth/signin?redirect=/sops');
        return;
      }
      
      // Get token from Supabase
      const token = await getToken();
      
      if (!token) {
        toast.error("Authentication required. Please sign in again.");
        router.push('/auth/signin?redirect=/sops');
        return;
      }
      
      const response = await fetch('/api/sops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New SOP',
          description: 'Click to edit this SOP',
        }),
      });
      
      if (response.status === 401) {
        toast.error("Authentication failed. Please sign in again.");
        router.push('/auth/signin?redirect=/sops');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create SOP');
      }
      
      const data = await response.json();
      toast.success("SOP created successfully!");
      router.push(`/sops/${data.data.id}`);
    } catch (error) {
      console.error('Error creating SOP:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create SOP. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const baseClasses = "px-4 py-2 rounded-md font-medium flex items-center";
  const primaryClasses = "bg-blue-600 text-white hover:bg-blue-700";
  const secondaryClasses = "bg-white text-blue-600 border border-blue-300 hover:bg-blue-50";
  
  const buttonClasses = [
    baseClasses,
    variant === 'primary' ? primaryClasses : secondaryClasses
  ].join(' ');
  
  return (
    <button 
      onClick={handleCreateSOP} 
      disabled={isCreating}
      className={buttonClasses}
    >
      {isCreating ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Create SOP
        </>
      )}
    </button>
  );
} 