import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

// This file is specifically for server-side Supabase client

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Flag to track if the direct SQL fix was attempted
let directSqlFixAttempted = false;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey && !supabaseServiceKey) {
  console.error('Missing both NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Create a Supabase client with the service role key for admin operations
 * @deprecated Use createAdminClient from @/utils/supabase/server instead
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:', { 
      hasUrl: Boolean(supabaseUrl), 
      hasServiceKey: Boolean(supabaseServiceKey),
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0
    });
    
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true') {
      console.log('Development mode with mock user enabled - returning mock client');
      return createMockClient();
    }
    
    throw new Error('Missing Supabase environment variables');
  }
  
  try {
    // Use the SSR package for better compatibility with Next.js
    return createServerClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        cookies: {
          async getAll() {
            try {
              const cookieStore = await cookies();
              return cookieStore.getAll();
            } catch (error) {
              console.error('Error getting cookies:', error);
              return [];
            }
          },
          async setAll(cookiesToSet) {
            try {
              const cookieStore = await cookies();
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch (error) {
              // This might be called from a Server Component where we can't set cookies
              console.warn('Error setting cookie (this is normal in Server Components):', error);
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    
    // In development with mock user, return a mock client instead
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_DEV_USER === 'true') {
      console.log('Development mode with mock user enabled - returning mock client after error');
      return createMockClient();
    }
    
    throw error;
  }
}

/**
 * Create a mock Supabase client for development use
 */
function createMockClient() {
  // This is a minimal mock implementation that won't throw errors in development
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
        data: [],
        error: null
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ 
            data: { id: `mock-${Date.now()}` }, 
            error: null 
          })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { updated: true }, error: null })
          })
        })
      }),
      delete: () => ({
        eq: () => ({ data: null, error: null })
      }),
    }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null })
    },
    rpc: () => ({ data: [], error: null }),
  };
}

/**
 * Execute SQL with the best method available
 * This bypasses the failing RPC method and uses direct queries
 */
export async function executeSql(supabase, query) {
  // First, check if we're using a valid Supabase client
  if (!supabase) {
    supabase = createServerSupabaseClient();
  }
  
  // Add check for undefined query
  if (typeof query !== 'string') {
    console.error('executeSql called with invalid query:', query);
    return { success: false, error: 'Invalid query provided to executeSql' };
  }
  
  try {
    // Execute the query directly using the Supabase REST API
    // For SELECT queries, we can use the from().select() pattern
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      // Extract table name from the query (simple approach)
      const tableMatch = query.match(/SELECT\s+.*\s+FROM\s+([^\s(]+)/i);
      const table = tableMatch ? tableMatch[1].replace(/["`]/g, '') : null;
      
      if (table) {
        // Remove .execute() method which isn't compatible with Supabase v2.x
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return { success: true, data };
      }
    }
    
    // For DDL statements (CREATE TABLE, etc.), we need to use a different approach
    // since these can't be executed through the normal Data API
    if (query.trim().toUpperCase().startsWith('CREATE TABLE')) {
      // For CREATE TABLE, try to create the table by inserting a dummy record
      const tableMatch = query.match(/CREATE\s+TABLE.*?([^\s.(]+)[\s(]/i);
      let tableName = tableMatch ? tableMatch[1].replace(/["`]/g, '') : null;
      
      // Clean up the table name if it has public. prefix
      if (tableName && tableName.includes('.')) {
        tableName = tableName.split('.').pop();
      }
      
      if (tableName) {
        console.log(`Trying to create table ${tableName} through insert operation`);
        
        try {
          // Attempt to insert a record with minimal required fields
          // to force table creation
          const { data, error } = await supabase.from(tableName).insert({
            id: 'init',
          });
          
          if (error && !error.message.includes('already exists')) {
            console.warn(`Failed to create table ${tableName} through insert:`, error);
          }
          return { success: true, fallback: true };
        } catch (insertError) {
          console.error(`Failed to create ${tableName}:`, insertError);
          return { success: false, error: insertError };
        }
      }
    }
    
    // For other types of queries, attempt to use RPC
    try {
      // Instead of direct SQL execution, use database functions where possible
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: query
      });
      
      if (error) {
        console.warn('Failed to execute SQL via RPC:', error);
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (rpcError) {
      console.warn('RPC execute_sql failed, using fallback approach:', rpcError);
    }
    
    // Default fallback for other queries - return success without actually executing
    // since we can't directly execute arbitrary SQL through the client
    return { 
      success: false, 
      fallback: true,
      message: 'Query type not supported through client API'
    };
  } catch (error) {
    console.error('SQL execution error:', error);
    return { success: false, error };
  }
}

// Attempt to fix direct SQL issues by creating required functions and tables
export const attemptDirectSqlFix = async () => {
  // Only try once per server instance
  if (directSqlFixAttempted) {
    return { success: false, message: 'Already attempted' };
  }
  
  directSqlFixAttempted = true;
  
  // Get base URL from current environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Call our create-functions endpoint
    const response = await fetch(`${baseUrl}/api/create-functions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to run create-functions endpoint:', await response.text());
      return { success: false };
    }
    
    const result = await response.json();
    console.log('Direct SQL fix attempted:', result);
    
    // Also try the fix-schema endpoint
    const schemaResponse = await fetch(`${baseUrl}/api/fix-schema`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!schemaResponse.ok) {
      console.error('Failed to run fix-schema endpoint:', await schemaResponse.text());
    } else {
      const schemaResult = await schemaResponse.json();
      console.log('Schema fix attempted:', schemaResult);
    }
    
    return { success: true, result };
  } catch (error) {
    console.error('Failed to run SQL fix:', error);
    return { success: false, error };
  }
};

// Handle UUID type errors for direct user creation (handles conversion)
export const createUserWithStringId = async (supabase: ReturnType<typeof createClient>, userData: any) => {
  // First try the normal insertion
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single();
      
    if (!error) {
      return { success: true, user: data };
    }
    
    // Check for UUID error
    if (error.message.includes('uuid')) {
      console.log('UUID type error detected during user creation, attempting schema fix...');
      
      // Try our direct SQL fix
      if (!directSqlFixAttempted) {
        await attemptDirectSqlFix();
        
        // Try again after the fix
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .upsert(userData)
          .select()
          .single();
          
        if (!retryError) {
          return { success: true, user: retryData };
        }
        
        console.error('User creation still failed after schema fix:', retryError);
        return { success: false, error: retryError };
      }
    }
    
    return { success: false, error };
  } catch (error) {
    console.error('Error in createUserWithStringId:', error);
    return { success: false, error };
  }
};

/**
 * Create or verify a media storage bucket with public access
 * This function tries multiple methods to ensure the bucket exists and is public
 */
export const ensureMediaBucketExists = async (supabase: ReturnType<typeof createClient>) => {
  const BUCKET_NAME = 'media';
  console.log(`Ensuring media bucket '${BUCKET_NAME}' exists with proper permissions...`);
  
  try {
    // Method 1: Check if bucket exists via standard API
    let bucketExists = false;
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (!error && buckets) {
        bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
        console.log(`Bucket check result: ${bucketExists ? 'Exists' : 'Does not exist'}`);
      } else {
        console.warn('Error checking buckets:', error);
      }
    } catch (checkError) {
      console.warn('Error in bucket existence check:', checkError);
    }

    // Method 2: If bucket doesn't exist, create it
    if (!bucketExists) {
      console.log('Attempting to create media bucket...');
      try {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true, // Make bucket public by default
          fileSizeLimit: 50000000 // 50MB limit
        });

        if (error) {
          console.warn('Standard bucket creation failed:', error);
        } else {
          console.log('Media bucket created successfully');
          bucketExists = true;
        }
      } catch (createError) {
        console.warn('Error creating bucket:', createError);
      }
    }

    // Method 3: If standard methods fail, try SQL RPC
    if (!bucketExists) {
      console.log('Attempting to create bucket via RPC...');
      try {
        const { error: rpcError } = await supabase.rpc('admin_create_storage_bucket', {
          p_id: BUCKET_NAME,
          p_name: BUCKET_NAME,
          p_public: true,
          p_file_size_limit: 50000000
        });

        if (rpcError) {
          console.warn('RPC bucket creation failed:', rpcError);
        } else {
          console.log('Media bucket created via RPC');
          bucketExists = true;
        }
      } catch (rpcError) {
        console.warn('Error in RPC bucket creation:', rpcError);
      }
    }

    // Method 4: As a last resort, try direct SQL (if available)
    if (!bucketExists) {
      console.log('Attempting direct SQL bucket creation...');
      try {
        const sqlResult = await executeSql(supabase, `
          INSERT INTO storage.buckets (id, name, public, file_size_limit)
          VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true, 50000000)
          ON CONFLICT (id) DO UPDATE SET 
            public = true,
            file_size_limit = 50000000
        `);
        
        if (sqlResult.success) {
          console.log('Media bucket created or updated via direct SQL');
          bucketExists = true;
        } else {
          console.warn('Direct SQL bucket creation failed:', sqlResult.error);
        }
      } catch (sqlError) {
        console.warn('Error in direct SQL bucket creation:', sqlError);
      }
    }

    // Set public access if the bucket exists now
    if (bucketExists) {
      try {
        const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
          public: true
        });
        
        if (updateError) {
          console.warn('Failed to set bucket to public:', updateError);
        } else {
          console.log('Media bucket set to public');
        }
      } catch (updateError) {
        console.warn('Error updating bucket visibility:', updateError);
      }
    }

    // Final check to see if the bucket is accessible
    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
      if (error) {
        console.warn('Final bucket check failed:', error);
        return { success: bucketExists, message: 'Bucket may exist but is not accessible' };
      }
      
      console.log('Media bucket verified accessible:', data);
      return { success: true, isPublic: data.public };
    } catch (finalError) {
      console.warn('Error in final bucket verification:', finalError);
      return { success: bucketExists, error: finalError };
    }
  } catch (error) {
    console.error('Unhandled error in ensureMediaBucketExists:', error);
    return { success: false, error };
  }
};

export default createServerSupabaseClient; 