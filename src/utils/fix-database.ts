'use client';

import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Triggers database fixes from the client side
 * This can be used when encountering database-related errors
 */
export async function fixDatabase(): Promise<{ success: boolean; message?: string; result?: any; error?: string }> {
  console.log('Attempting to fix database issues...');
  
  try {
    // Get current Supabase token if available
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    // Check if token is very large
    const useTokenRef = token && token.length > 4000;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (useTokenRef) {
      // Use token reference pattern for large tokens
      console.log('Using token reference for large auth token');
      const tokenId = `fix_db_${Date.now()}`;
      localStorage.setItem(tokenId, token);
      headers['X-Auth-Token-Ref'] = tokenId;
      
      // Cleanup after 60 seconds
      setTimeout(() => {
        localStorage.removeItem(tokenId);
      }, 60000);
    } else if (token) {
      // Use standard authorization header
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Call the fix-database endpoint
    const response = await fetch('/api/fix-database', {
      method: 'POST',
      headers
    });
    
    // Clean up token reference if used
    if (useTokenRef) {
      localStorage.removeItem(headers['X-Auth-Token-Ref']);
    }
    
    if (!response.ok) {
      // Handle 431 error (Request Header Fields Too Large)
      if (response.status === 431 && token) {
        console.log('Received 431 error, retrying with smaller headers');
        
        // Always use token reference on retry
        const tokenId = `fix_db_retry_${Date.now()}`;
        localStorage.setItem(tokenId, token);
        
        const retryResponse = await fetch('/api/fix-database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token-Ref': tokenId
          }
        });
        
        // Clean up token reference
        localStorage.removeItem(tokenId);
        
        if (retryResponse.ok) {
          const result = await retryResponse.json();
          console.log('Database fix retry result:', result);
          return { success: true, message: 'Database fix successful on retry', result };
        }
        
        const errorText = await retryResponse.text();
        console.error('Failed to fix database on retry:', errorText);
        return { success: false, message: 'Database fix failed on retry', error: errorText };
      }
      
      const errorText = await response.text();
      console.error('Failed to fix database:', errorText);
      return { success: false, message: 'Database fix failed', error: errorText };
    }
    
    const result = await response.json();
    console.log('Database fix result:', result);
    return { success: true, message: 'Database fix successful', result };
  } catch (error) {
    console.error('Error fixing database:', error);
    return { 
      success: false, 
      message: 'Error encountered during database fix',
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Utility function to add a retry with database fix capability
 * when making authenticated API requests that might fail due to database issues
 */
export async function withDatabaseFix<T>(
  apiFn: () => Promise<T>
): Promise<T> {
  try {
    // First try the API call normally
    return await apiFn();
  } catch (error: any) {
    // If the error appears to be database-related, try to fix and retry
    if (
      error.message?.includes('relation') ||
      error.message?.includes('table') ||
      error.message?.includes('policy') ||
      error.message?.includes('permission denied') ||
      error.status === 403
    ) {
      console.log('Detected possible database issue, attempting fix...');
      
      // Try to fix the database
      const fixResult = await fixDatabase();
      
      if (fixResult.success) {
        console.log('Database fixed, retrying API call...');
        // Retry the API call
        return await apiFn();
      } else {
        console.error('Database fix failed, cannot retry API call');
        throw error;
      }
    }
    
    // For other errors, just re-throw
    throw error;
  }
} 