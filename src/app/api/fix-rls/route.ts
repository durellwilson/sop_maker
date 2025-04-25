import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, executeSql } from '@/utils/server/supabase-server';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    // Create Supabase client with admin privileges
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Failed to create Supabase client" }, { status: 500 });
    }
    
    // Enable RLS on app_metadata table
    try {
      logs.push("Enabling RLS on app_metadata table");
      await executeSql(supabase, `
        ALTER TABLE IF EXISTS public.app_metadata ENABLE ROW LEVEL SECURITY;
      `);
    } catch (error) {
      errors.push(`Error enabling RLS on app_metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Create RLS policies for tables that have RLS enabled but no policies
    
    // Users table policy
    try {
      logs.push("Creating RLS policy for users table");
      await executeSql(supabase, `
        CREATE POLICY IF NOT EXISTS "Users can view their own profile"
        ON public.users FOR SELECT
        USING (auth.uid() = id);
        
        CREATE POLICY IF NOT EXISTS "Users can update their own profile"
        ON public.users FOR UPDATE
        USING (auth.uid() = id);
      `);
    } catch (error) {
      errors.push(`Error creating users table policies: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // SOPs table policy
    try {
      logs.push("Creating RLS policy for sops table");
      await executeSql(supabase, `
        CREATE POLICY IF NOT EXISTS "Users can view their own SOPs"
        ON public.sops FOR SELECT
        USING (auth.uid() = created_by);
        
        CREATE POLICY IF NOT EXISTS "Users can update their own SOPs"
        ON public.sops FOR UPDATE
        USING (auth.uid() = created_by);
        
        CREATE POLICY IF NOT EXISTS "Users can delete their own SOPs"
        ON public.sops FOR DELETE
        USING (auth.uid() = created_by);
        
        CREATE POLICY IF NOT EXISTS "Users can insert SOPs"
        ON public.sops FOR INSERT
        WITH CHECK (auth.uid() = created_by);
      `);
    } catch (error) {
      errors.push(`Error creating sops table policies: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Steps table policy
    try {
      logs.push("Creating RLS policy for steps table");
      await executeSql(supabase, `
        CREATE POLICY IF NOT EXISTS "Users can view steps of their SOPs"
        ON public.steps FOR SELECT
        USING (
          sop_id IN (
            SELECT id FROM public.sops WHERE created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can update steps of their SOPs"
        ON public.steps FOR UPDATE
        USING (
          sop_id IN (
            SELECT id FROM public.sops WHERE created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can delete steps of their SOPs"
        ON public.steps FOR DELETE
        USING (
          sop_id IN (
            SELECT id FROM public.sops WHERE created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can insert steps to their SOPs"
        ON public.steps FOR INSERT
        WITH CHECK (
          sop_id IN (
            SELECT id FROM public.sops WHERE created_by = auth.uid()
          )
        );
      `);
    } catch (error) {
      errors.push(`Error creating steps table policies: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Media table policy
    try {
      logs.push("Creating RLS policy for media table");
      await executeSql(supabase, `
        CREATE POLICY IF NOT EXISTS "Users can view media of their steps"
        ON public.media FOR SELECT
        USING (
          step_id IN (
            SELECT steps.id FROM public.steps
            JOIN public.sops ON steps.sop_id = sops.id
            WHERE sops.created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can update media of their steps"
        ON public.media FOR UPDATE
        USING (
          step_id IN (
            SELECT steps.id FROM public.steps
            JOIN public.sops ON steps.sop_id = sops.id
            WHERE sops.created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can delete media of their steps"
        ON public.media FOR DELETE
        USING (
          step_id IN (
            SELECT steps.id FROM public.steps
            JOIN public.sops ON steps.sop_id = sops.id
            WHERE sops.created_by = auth.uid()
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Users can insert media to their steps"
        ON public.media FOR INSERT
        WITH CHECK (
          step_id IN (
            SELECT steps.id FROM public.steps
            JOIN public.sops ON steps.sop_id = sops.id
            WHERE sops.created_by = auth.uid()
          )
        );
      `);
    } catch (error) {
      errors.push(`Error creating media table policies: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Fix the function search path mutable issue
    try {
      logs.push("Fixing search paths for functions");
      
      // Fix exec_sql function
      await executeSql(supabase, `
        CREATE OR REPLACE FUNCTION public.exec_sql(query text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE query;
          result := json_build_object('success', true);
          RETURN result;
        EXCEPTION WHEN OTHERS THEN
          result := json_build_object('success', false, 'error', SQLERRM);
          RETURN result;
        END;
        $$;
      `);
      
      // Fix function_exists function
      await executeSql(supabase, `
        CREATE OR REPLACE FUNCTION public.function_exists(function_name text)
        RETURNS boolean
        LANGUAGE plpgsql
        SET search_path = public
        AS $$
        DECLARE
          found boolean;
        BEGIN
          SELECT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = function_name
          ) INTO found;
          RETURN found;
        END;
        $$;
      `);
      
      // Fix admin_create_storage_bucket function if it exists
      try {
        await executeSql(supabase, `
          CREATE OR REPLACE FUNCTION public.admin_create_storage_bucket(
            p_id text, 
            p_name text, 
            p_public boolean, 
            p_file_size_limit bigint DEFAULT NULL
          )
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          SET search_path = public
          AS $$
          BEGIN
            INSERT INTO storage.buckets (id, name, public, file_size_limit)
            VALUES (p_id, p_name, p_public, p_file_size_limit)
            ON CONFLICT (id) DO UPDATE
            SET name = p_name,
                public = p_public,
                file_size_limit = p_file_size_limit;
          END;
          $$;
        `);
      } catch (error) {
        logs.push(`admin_create_storage_bucket function not found or could not be updated`);
      }
      
      // Fix get_service_role_bucket_policy function if it exists
      try {
        await executeSql(supabase, `
          CREATE OR REPLACE FUNCTION public.get_service_role_bucket_policy(bucket_id text)
          RETURNS text
          LANGUAGE plpgsql
          SECURITY DEFINER
          SET search_path = public
          AS $$
          DECLARE
            bucket_public boolean;
          BEGIN
            SELECT public INTO bucket_public FROM storage.buckets WHERE id = bucket_id;
            RETURN '{
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow", 
                  "Principal": {"AWS": "*"},
                  "Action": ["s3:GetObject"],
                  "Resource": ["arn:aws:s3:::' || bucket_id || '/*"]
                }
              ]
            }';
          END;
          $$;
        `);
      } catch (error) {
        logs.push(`get_service_role_bucket_policy function not found or could not be updated`);
      }
      
    } catch (error) {
      errors.push(`Error fixing function search paths: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return NextResponse.json({
      success: true,
      logs,
      errors: errors.length > 0 ? errors : null
    });
    
  } catch (error) {
    console.error("Error in fix-rls endpoint:", error);
    return NextResponse.json({
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      logs,
      errors
    }, { status: 500 });
  }
} 