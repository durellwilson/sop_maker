'use client';

import { SOP, Step, Media, MediaType } from '@/types/database.types';
import { createBrowserClient } from '@/utils/supabase/client';
import { withDatabaseFix } from './fix-database';

/**
 * Base function for making authenticated API requests
 * Works with token-based authentication
 */
async function fetchWithAuth(url: string, options: RequestInit = {}, providedToken?: string) {
  let authToken = providedToken;
  
  try {
    // Create Supabase client for auth operations
    const supabase = createBrowserClient();
    
    // Try to get a valid token if not provided
    if (!authToken) {
      try {
        // Get session token, which automatically handles refresh
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          authToken = session.access_token;
          console.log('Using current session token for API request');
        } else {
          // No session found, try to refresh
          console.log('No active session found, attempting refresh');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Failed to refresh Supabase session:', error);
            // Don't throw yet, handle auth failure based on response later
          } else if (data.session?.access_token) {
            console.log('Session refresh successful');
            authToken = data.session.access_token;
          }
        }
      } catch (sessionError) {
        console.warn('Failed to get Supabase session:', sessionError);
      }
    }
    
    // Set up request headers
    const headers = new Headers(options.headers);
    
    // Add auth token with size limiting to prevent 431 errors
    if (authToken) {
      // Check if token is excessively large (>4KB) and trim if necessary
      if (authToken.length > 4000) {
        console.warn('Auth token is very large, using compact authorization method');
        // Use a different authorization method - store token in localStorage temporarily
        // and send a reference instead of the full token
        const tokenId = `auth_${Date.now()}`;
        localStorage.setItem(tokenId, authToken);
        headers.set('X-Auth-Token-Ref', tokenId);
        
        // Set cleanup timeout to remove the token after 1 minute
        setTimeout(() => {
          localStorage.removeItem(tokenId);
        }, 60000);
      } else {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
    } else {
      console.warn('Making unauthenticated request - no valid token available');
    }
    
    console.log(`Making API request to ${url}`);

    // Make the fetch request - use smaller timeout to avoid long-hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies with request
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Handle error responses
    if (!response.ok) {
      const status = response.status;
      let errorMessage = `Request failed with status ${status}`;
      let errorData;
      let errorText = '';
      
      try {
        // Try to extract error details from the response first
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
          
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } else {
          errorText = await response.text();
          if (errorText) errorMessage += `: ${errorText}`;
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        try {
          // Fallback attempt to get the text
          errorText = await response.text().catch(() => '');
        } catch {}
      }
      
      // Enhanced logging for 500 errors
      if (status === 500) {
        console.error('Server error (500) in API request to:', url);
        console.error('Request method:', options.method || 'GET');
        console.error('Request headers:', Object.fromEntries([...headers.entries()].filter(([key]) => !key.toLowerCase().includes('auth'))));
        
        if (errorData) {
          console.error('Server error details:', errorData);
        } else if (errorText) {
          console.error('Server error text:', errorText);
        }
        
        throw new Error(`Server error: ${errorMessage} (Please try again later)`);
      }
      
      // Special handling for header size errors (431)
      if (status === 431) {
        console.error('Request header too large (431) - attempting to fix auth token');
        
        // Try to make a new request without the auth header
        const retryHeaders = new Headers(options.headers);
        
        // Use a compact reference-based auth method
        const tokenId = `retry_auth_${Date.now()}`;
        if (authToken) {
          localStorage.setItem(tokenId, authToken);
          retryHeaders.set('X-Auth-Token-Ref', tokenId);
        }
        
        // Make the retry fetch with smaller headers
        try {
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: 'include'
          });
          
          if (retryResponse.ok) {
            // Cleanup localStorage
            localStorage.removeItem(tokenId);
            
            // Parse successful response
            return await retryResponse.json();
          } else {
            errorMessage = `Retry also failed with status ${retryResponse.status}`;
          }
        } catch (retryError) {
          errorMessage = `Failed to retry request: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`;
        } finally {
          // Cleanup localStorage
          localStorage.removeItem(tokenId);
        }
      }
      
      // Special handling for auth errors
      if (status === 401 || status === 403) {
        console.error('Authentication error - invalid or expired token');
        
        // Try to refresh session automatically
        try {
          const { error } = await supabase.auth.refreshSession();
          
          if (error) {
            // Clear invalid tokens if refresh fails
            await supabase.auth.signOut({ scope: 'local' });
            console.warn('Session expired or invalid - redirecting to login');
            
            // Redirect to login page after a brief delay
            setTimeout(() => {
              window.location.href = '/auth/signin?error=session_expired';
            }, 500);
          }
        } catch (refreshError) {
          console.error('Error during token refresh:', refreshError);
        }
        
        throw new Error(`Authentication failed: ${errorMessage}`);
      }
      
      throw new Error(errorMessage);
    }

    // Parse successful response
    try {
      return await response.json();
    } catch (jsonError) {
      // Handle empty or non-JSON responses
      return { success: true };
    }
  } catch (error) {
    // Enhanced error handling
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network Error:', { url, error });
      throw new Error(`Network error: Unable to connect to ${url.split('/').slice(-1)[0]}`);
    }
    
    // Rethrow other errors
    throw error;
  }
}

/**
 * Fetch all SOPs for the current user
 * @param token Authentication token
 * @returns Array of SOP objects
 */
export async function fetchSOPs(token: string): Promise<SOP[]> {
  try {
    const result = await fetchWithAuth('/api/sops', {}, token);
    
    // Handle the API response based on its format
    if (Array.isArray(result)) {
      // Direct array format
      return result;
    } else if (result?.data && Array.isArray(result.data)) {
      // { data: [...] } format (current API format)
      return result.data;
    } else if (result?.sops && Array.isArray(result.sops)) {
      // { sops: [...] } format (alternative format)
      return result.sops;
    }
    
    // If we can't determine the format, log the issue and return empty array
    console.error('Unexpected response format from /api/sops:', result);
    return [];
  } catch (error) {
    console.error('Error fetching SOPs:', error);
    throw error;
  }
}

/**
 * Create a new SOP
 * @param token Authentication token
 * @param data SOP data
 * @returns Created SOP object
 */
export async function createSOP(token: string, data: Partial<SOP>): Promise<SOP> {
  // Use the withDatabaseFix utility to automatically retry with database fix
  return withDatabaseFix(async () => {
    try {
      // Normalize data format - API accepts both direct SOP data or nested inside 'sop' property
      const payload = {
        // Include fields at top level for backward compatibility
        title: data.title,
        description: data.description,
        category: data.category,
        status: data.status,
        // Also include nested structure for newer API versions
        sop: {
          ...data
        }
      };
      
      console.log('Sending SOP creation payload:', payload);
      
      // Implement retry with exponential backoff for server errors
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let lastError: Error | null = null;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          // Make the API call
          const result = await fetchWithAuth('/api/sops', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }, token);
          
          // Parse response based on expected format
          if (result?.sop) {
            return result.sop;
          } 
          
          // Fallback for backward compatibility
          if (result?.data) {
            return result.data;
          }
          
          // Handle direct object return
          if (result?.id) {
            return result;
          }
          
          // If we get here, the response format is invalid
          throw new Error('The server returned an invalid response format for SOP creation');
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Only retry on server errors (500) or network issues
          const isServerError = lastError.message.includes('500') || 
                               lastError.message.includes('server error');
          const isNetworkError = lastError.message.includes('network') || 
                                 lastError.message.includes('fetch');
                                 
          if ((isServerError || isNetworkError) && retryCount < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s...
            const backoffTime = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying SOP creation after server error (attempt ${retryCount + 1}/${MAX_RETRIES}). Waiting ${backoffTime}ms...`);
            
            // If we have multiple failures, try database fix
            if (retryCount > 0) {
              const { fixDatabase } = await import('./fix-database');
              console.log('Attempting database fix before retry...');
              await fixDatabase();
            }
            
            // Wait for backoff time
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            retryCount++;
            continue;
          }
          
          // If we're not retrying, rethrow the error
          throw lastError;
        }
      }
      
      // If we've exhausted all retries, throw the last error
      if (lastError) {
        throw lastError;
      }
      
      // This line should never be reached due to the throw above
      throw new Error('Unexpected error in SOP creation');
    } catch (error) {
      // Enhanced error reporting
      console.error('Error creating SOP:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while creating SOP';
        
      // Rethrow with clear message
      throw new Error(errorMessage);
    }
  });
}

/**
 * Update an existing SOP
 */
export async function updateSOP(token: string, sopId: string, data: Partial<SOP>): Promise<SOP> {
  const result = await fetchWithAuth(`/api/sops/${sopId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, token);
  
  return result.sop;
}

/**
 * Fetch SOP details and its steps
 */
export async function fetchSopDetails(token: string, sopId: string): Promise<{ sop: SOP; steps: Step[] }> {
  const [sopData, stepsData] = await Promise.all([
    fetchWithAuth(`/api/sops/${sopId}`, {}, token),
    fetchWithAuth(`/api/steps?sopId=${sopId}`, {}, token),
  ]);
  
  return {
    sop: sopData.sop,
    steps: stepsData.steps,
  };
}

/**
 * Add a new step to an SOP
 */
export async function addStep(token: string, data: Partial<Step>): Promise<Step> {
  const result = await fetchWithAuth('/api/steps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, token);
  
  return result.step;
}

/**
 * Update an existing step
 */
export async function updateStep(token: string, stepId: string, data: Partial<Step>): Promise<Step> {
  const result = await fetchWithAuth(`/api/steps/${stepId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, token);
  
  return result.step;
}

/**
 * Delete a step
 */
export async function deleteStep(token: string, stepId: string): Promise<void> {
  await fetchWithAuth(`/api/steps/${stepId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Upload media for a step
 */
export async function uploadMedia(
  token: string, 
  file: File, 
  sopId: string, 
  stepId: string, 
  type: MediaType
): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sopId', sopId);
  formData.append('stepId', stepId);
  formData.append('type', type);
  
  const result = await fetchWithAuth('/api/upload-media', {
    method: 'POST',
    body: formData,
  }, token);
  
  return result.media;
}

/**
 * Generate step instructions using AI
 */
export async function generateInstructions(token: string, prompt: string): Promise<string> {
  const result = await fetchWithAuth('/api/generate-instructions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  }, token);
  
  return result.instructions;
}

/**
 * Generate a video script for an SOP
 */
export async function generateVideoScript(token: string, sopId: string): Promise<string> {
  const result = await fetchWithAuth('/api/generate-video-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sopId }),
  }, token);
  
  return result.videoScript;
}

/**
 * Fetch SOP details with steps and media for preview
 */
export async function fetchSopDetailsForPreview(
  token: string, 
  sopId: string
): Promise<{ sop: SOP; steps: (Step & { media: Media[] })[] }> {
  const { sop, steps } = await fetchSopDetails(token, sopId);
  
  // For each step, fetch its media
  const stepsWithMedia = await Promise.all(
    steps.map(async (step) => {
      const mediaResult = await fetchWithAuth(`/api/media?stepId=${step.id}`, {}, token);
      return {
        ...step,
        media: mediaResult.media || [],
      };
    })
  );
  
  return {
    sop,
    steps: stepsWithMedia,
  };
}

/**
 * Upload media file for a step
 */
export async function uploadStepMedia(
  token: string, 
  stepId: string, 
  file: File
): Promise<Media> {
  try {
    // Create a new Supabase client
    const supabase = createBrowserClient();
    
    // Ensure we have a valid Supabase token
    let supabaseToken = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      supabaseToken = session?.access_token;
    } catch (sessionError) {
      console.warn('Failed to get Supabase session:', sessionError);
    }
    
    // Check file size (10MB limit from custom_instructions)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    // Check file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types are: ${ALLOWED_TYPES.join(', ')}`);
    }
    
    // Use Supabase token if available, otherwise fall back to the provided token
    const authToken = supabaseToken || token;
    
    if (!authToken) {
      throw new Error('Authentication required');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stepId', stepId);
    
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse JSON, just use the status code message
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    return result.media;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error instanceof Error ? error : new Error('Unknown error during upload');
  }
} 