import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { serverLogger as logger } from '@/lib/logger/server-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase environment variables',
      }, { status: 500 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const results = [];
    
    // Fix 1: Enable RLS on tables
    try {
      // Enable RLS on app_metadata
      const { error: appMetadataRlsError } = await supabase.rpc('admin_query', {
        query_text: 'ALTER TABLE public.app_metadata ENABLE ROW LEVEL SECURITY;'
      });
      
      results.push({
        action: 'enable_rls_on_app_metadata',
        status: appMetadataRlsError ? 'error' : 'success',
        error: appMetadataRlsError?.message
      });
      
      // Enable RLS on firebase_user_mapping
      const { error: firebaseUserMappingRlsError } = await supabase.rpc('admin_query', {
        query_text: 'ALTER TABLE public.firebase_user_mapping ENABLE ROW LEVEL SECURITY;'
      });
      
      results.push({
        action: 'enable_rls_on_firebase_user_mapping',
        status: firebaseUserMappingRlsError ? 'error' : 'success',
        error: firebaseUserMappingRlsError?.message
      });
      
      // Add policies for app_metadata
      const appMetadataPolicies = [
        `CREATE POLICY "Allow users to read their own app_metadata" ON public.app_metadata FOR SELECT USING (auth.uid() = supabase_uuid);`,
        `CREATE POLICY "Allow users to update their own app_metadata" ON public.app_metadata FOR UPDATE USING (auth.uid() = supabase_uuid);`,
        `CREATE POLICY "Service role can manage app_metadata" ON public.app_metadata USING (auth.jwt() ->> 'role' = 'service_role');`
      ];
      
      for (const policy of appMetadataPolicies) {
        const { error } = await supabase.rpc('admin_query', { query_text: policy });
        results.push({
          action: 'create_app_metadata_policy',
          query: policy,
          status: error ? 'error' : 'success',
          error: error?.message
        });
      }
      
      // Add policies for firebase_user_mapping
      const firebaseUserMappingPolicies = [
        `CREATE POLICY "Allow users to read their own mapping" ON public.firebase_user_mapping FOR SELECT USING (auth.uid() = supabase_uuid);`,
        `CREATE POLICY "Service role can manage firebase_user_mapping" ON public.firebase_user_mapping USING (auth.jwt() ->> 'role' = 'service_role');`
      ];
      
      for (const policy of firebaseUserMappingPolicies) {
        const { error } = await supabase.rpc('admin_query', { query_text: policy });
        results.push({
          action: 'create_firebase_user_mapping_policy',
          query: policy,
          status: error ? 'error' : 'success',
          error: error?.message
        });
      }
    } catch (error) {
      logger.error('Error fixing RLS:', error);
      results.push({
        action: 'fix_rls',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Fix 2: Set search_path for functions
    try {
      const functionFixes = [
        { name: 'exec_sql', query: 'ALTER FUNCTION public.exec_sql(query text) SET search_path = public;' },
        { name: 'function_exists', query: 'ALTER FUNCTION public.function_exists(function_name text) SET search_path = public;' },
        { name: 'get_user_id_from_auth', query: 'ALTER FUNCTION public.get_user_id_from_auth() SET search_path = public;' },
        { name: 'get_current_user_id', query: 'ALTER FUNCTION public.get_current_user_id() SET search_path = public;' },
        { name: 'admin_create_storage_bucket', query: 'ALTER FUNCTION public.admin_create_storage_bucket(p_id text, p_name text, p_public boolean) SET search_path = public;' },
        { name: 'get_service_role_bucket_policy', query: 'ALTER FUNCTION public.get_service_role_bucket_policy(bucket_id text) SET search_path = public;' }
      ];
      
      for (const fix of functionFixes) {
        const { error } = await supabase.rpc('admin_query', { query_text: fix.query });
        results.push({
          action: `fix_function_${fix.name}`,
          status: error ? 'error' : 'success',
          error: error?.message
        });
      }
    } catch (error) {
      logger.error('Error fixing function search paths:', error);
      results.push({
        action: 'fix_function_search_paths',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Security fixes applied',
      results
    });
    
  } catch (error) {
    logger.error('Security fix error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Security fix failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 