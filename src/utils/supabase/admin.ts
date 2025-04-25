import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Creates an Admin Supabase client for server-side operations that need to bypass RLS.
 * Uses the Service Role Key with a simple singleton pattern.
 */

// Singleton instance
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  // Return existing instance if available
  if (adminClient) {
    return adminClient;
  }
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // For development, provide a mock client
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - creating mock admin client');
      // Return a minimal mock client that won't throw errors
      return {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockData(table), error: null }),
              order: () => ({
                range: () => ({ data: [mockData(table)], error: null, count: 1 })
              })
            }),
            order: () => ({
              range: () => ({ data: [mockData(table)], error: null, count: 1 })
            })
          }),
          insert: (data: any) => ({
            select: () => ({
              single: async () => ({ 
                data: { id: 'mock-id', ...data, created_at: new Date().toISOString() }, 
                error: null 
              })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({ data: mockData(table), error: null })
            })
          }),
          delete: () => ({
            eq: () => ({ error: null })
          })
        })
      } as any;
    }
    
    console.error('Missing Supabase URL or Service Role Key for admin client');
    throw new Error('Missing Supabase admin client configuration');
  }

  // Create the real admin client
  adminClient = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
  
  return adminClient;
}

// Helper function to generate mock data for development
function mockData(table: string) {
  const timestamp = new Date().toISOString();
  
  if (table === 'user_sops') {
    return {
      id: 'mock-sop-id',
      title: 'Mock SOP Title',
      description: 'This is a mock SOP for development',
      created_by: 'dev-mock-user-id',
      updated_by: 'dev-mock-user-id',
      created_at: timestamp,
      updated_at: timestamp,
      status: 'draft',
      category: 'Development',
      tags: ['mock', 'development']
    };
  }
  
  if (table === 'sop_steps') {
    return {
      id: 'mock-step-id',
      sop_id: 'mock-sop-id',
      title: 'Mock Step Title',
      description: 'This is a mock step for development',
      order: 1,
      created_at: timestamp,
      updated_at: timestamp
    };
  }
  
  // Generic mock data
  return {
    id: `mock-${table}-id`,
    created_at: timestamp,
    updated_at: timestamp
  };
} 