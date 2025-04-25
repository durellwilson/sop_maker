import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Use service role for schema modifications
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    const { options } = await request.json();
    
    // Create function to execute SQL if needed
    if (options?.createFunctions) {
      try {
        // Check if exec_sql function exists
        const { data: functionExists } = await supabase.rpc('function_exists', { 
          function_name: 'exec_sql'
        }).maybeSingle();
        
        if (!functionExists) {
          logs.push("Creating exec_sql function");
          await supabase.rpc('exec_sql', { 
            query: `
              CREATE OR REPLACE FUNCTION public.exec_sql(query text)
              RETURNS json
              LANGUAGE plpgsql
              SECURITY DEFINER
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
            `
          });
        }
      } catch (e) {
        // If function_exists itself doesn't exist, create it first
        logs.push("Creating function_exists function");
        await supabase.sql`
          CREATE OR REPLACE FUNCTION public.function_exists(function_name text)
          RETURNS boolean
          LANGUAGE plpgsql
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
        `;
        
        logs.push("Retrying creation of exec_sql function");
        await supabase.sql`
          CREATE OR REPLACE FUNCTION public.exec_sql(query text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
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
        `;
      }
    }

    // Create missing tables if needed
    if (options?.createTables) {
      try {
        logs.push("Checking and creating missing tables");
        
        // Check if users table exists
        const { data: usersExists } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'users')
          .maybeSingle();
        
        if (!usersExists) {
          logs.push("Creating users table");
          await supabase.sql`
            CREATE TABLE IF NOT EXISTS public.users (
              id UUID PRIMARY KEY,
              firebase_uid TEXT UNIQUE,
              email TEXT UNIQUE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
          `;
        }
        
        // Check if app_metadata table exists
        const { data: metadataExists } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'app_metadata')
          .maybeSingle();
        
        if (!metadataExists) {
          logs.push("Creating app_metadata table");
          await supabase.sql`
            CREATE TABLE IF NOT EXISTS public.app_metadata (
              key TEXT PRIMARY KEY,
              value JSONB,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            -- Insert schema version
            INSERT INTO public.app_metadata (key, value)
            VALUES ('schema_version', '"1.0"')
            ON CONFLICT (key) DO UPDATE SET value = '"1.0"', updated_at = now();
          `;
        }
      } catch (error: any) {
        errors.push(`Error creating tables: ${error.message}`);
      }
    }

    // Fix schema version if needed
    if (options?.updateSchemaVersion) {
      try {
        logs.push("Updating schema version");
        await supabase.sql`
          INSERT INTO public.app_metadata (key, value)
          VALUES ('schema_version', '"1.0"')
          ON CONFLICT (key) DO UPDATE SET value = '"1.0"', updated_at = now();
        `;
      } catch (error: any) {
        errors.push(`Error updating schema version: ${error.message}`);
      }
    }

    // Fix column types if needed (particularly UUID issues)
    if (options?.fixColumnTypes) {
      try {
        logs.push("Fixing column types");
        
        // Check if firebase_uid column exists in users table
        const { data: hasFirebaseUid } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'users')
          .eq('column_name', 'firebase_uid')
          .maybeSingle();
        
        if (!hasFirebaseUid) {
          logs.push("Adding firebase_uid column to users table");
          await supabase.sql`
            ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
          `;
        }
        
        // Check if updated_at column exists in users table
        const { data: hasUpdatedAt } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'users')
          .eq('column_name', 'updated_at')
          .maybeSingle();
        
        if (!hasUpdatedAt) {
          logs.push("Adding updated_at column to users table");
          await supabase.sql`
            ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
          `;
        }
        
        // Create a function to convert Firebase UIDs to UUIDs if needed
        logs.push("Creating function to handle Firebase UIDs");
        await supabase.sql`
          CREATE OR REPLACE FUNCTION public.create_uuid_from_firebase_uid()
          RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.id IS NULL THEN
              NEW.id = uuid_generate_v4();
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
          
          DROP TRIGGER IF EXISTS users_firebase_uuid_trigger ON public.users;
          
          CREATE TRIGGER users_firebase_uuid_trigger
          BEFORE INSERT ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.create_uuid_from_firebase_uid();
        `;
      } catch (error: any) {
        errors.push(`Error fixing column types: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error: any) {
    console.error("Error in fix-schema endpoint:", error);
    return NextResponse.json({
      success: false, 
      error: error.message,
      logs,
      errors
    }, { status: 500 });
  }
} 