'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback } from 'react';
import { Database } from '@/types/supabase';
import { useSession } from '@/utils/auth';

// Type for the response from API endpoints
type ApiResponse<T = any> = T;

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom hook that provides API client functionality with authentication
 */
export function useApiClient() {
  const supabase = createClientComponentClient<Database>();
  const { session } = useSession();
  
  const isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Makes a GET request to the specified endpoint
   */
  const get = useCallback(async <T>(url: string): Promise<ApiResponse<T>> => {
    if (!session) {
      if (isDevelopment && url.includes('/api/')) {
        console.warn('No active session, but continuing in development mode');
      } else {
        throw new AuthenticationError('No active session');
      }
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [session, isDevelopment]);
  
  /**
   * Makes a POST request to the specified endpoint with the given data
   */
  const post = useCallback(async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
    if (!session) {
      if (isDevelopment && url.includes('/api/')) {
        console.warn('No active session, but continuing in development mode');
      } else {
        throw new AuthenticationError('No active session');
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [session, isDevelopment]);
  
  /**
   * Makes a PUT request to the specified endpoint with the given data
   */
  const put = useCallback(async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
    if (!session) {
      if (isDevelopment && url.includes('/api/')) {
        console.warn('No active session, but continuing in development mode');
      } else {
        throw new AuthenticationError('No active session');
      }
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [session, isDevelopment]);
  
  /**
   * Makes a DELETE request to the specified endpoint
   */
  const del = useCallback(async <T>(url: string): Promise<ApiResponse<T>> => {
    if (!session) {
      if (isDevelopment && url.includes('/api/')) {
        console.warn('No active session, but continuing in development mode');
      } else {
        throw new AuthenticationError('No active session');
      }
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [session, isDevelopment]);
  
  /**
   * Uploads a file to the specified endpoint
   */
  const uploadFile = useCallback(async <T>(url: string, file: File): Promise<ApiResponse<T>> => {
    if (!session) {
      if (isDevelopment && url.includes('/api/')) {
        console.warn('No active session, but continuing in development mode');
      } else {
        throw new AuthenticationError('No active session');
      }
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include', // Include cookies for auth
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }, [session, isDevelopment]);
  
  return {
    get,
    post,
    put,
    delete: del,
    uploadFile,
  };
} 