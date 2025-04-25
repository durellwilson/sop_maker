-- Migration: ensure_exec_sql
-- Description: Ensures the exec_sql function and its helper table exist with proper RLS

-- First check if the helper table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = '_exec_sql'
  ) THEN
    -- Create the helper table to log executions
    CREATE TABLE public._exec_sql (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query TEXT NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      executed_by UUID DEFAULT auth.uid(),
      success BOOLEAN NOT NULL,
      result JSONB,
      error TEXT
    );

    -- Enable RLS
    ALTER TABLE public._exec_sql ENABLE ROW LEVEL SECURITY;

    -- Create policies: only admins can select
    CREATE POLICY "_exec_sql_select_policy"
      ON public._exec_sql
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.uid() = auth.users.id
          AND auth.users.role = 'admin'
        )
      );

    -- Create policies: only admins can insert
    CREATE POLICY "_exec_sql_insert_policy"
      ON public._exec_sql
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.uid() = auth.users.id
          AND auth.users.role = 'admin'
        )
      );

    -- Comment on table
    COMMENT ON TABLE public._exec_sql IS 'Helper table to log SQL executions made through the exec_sql function. Only accessible to admins.';
  END IF;

  -- Check if the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'exec_sql'
  ) THEN
    -- Create the function
    CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
      execution_id UUID := gen_random_uuid();
      success BOOLEAN := false;
      error_message TEXT;
      start_time TIMESTAMP WITH TIME ZONE := NOW();
    BEGIN
      -- Verify the user has admin role
      IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = auth.users.id
        AND auth.users.role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Permission denied: Admin role required';
      END IF;

      -- Execute the query
      BEGIN
        EXECUTE query INTO result;
        success := true;
      EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        -- Return a JSONB null if no result
        result := NULL;
      END;

      -- Log the execution
      INSERT INTO public._exec_sql (
        id, 
        query, 
        executed_at, 
        executed_by, 
        success, 
        result, 
        error
      ) 
      VALUES (
        execution_id, 
        query, 
        start_time, 
        auth.uid(), 
        success, 
        result, 
        error_message
      );

      -- Return the result
      RETURN jsonb_build_object(
        'success', success,
        'execution_id', execution_id,
        'timestamp', start_time,
        'error', error_message,
        'result', result
      );
    END;
    $$;

    -- Grant execute to authenticated users (RLS will handle actual permissions)
    GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;

    -- Comment on function
    COMMENT ON FUNCTION public.exec_sql IS 'Executes arbitrary SQL. Only available to admin users via RLS policies.';
  END IF;
END
$$; 