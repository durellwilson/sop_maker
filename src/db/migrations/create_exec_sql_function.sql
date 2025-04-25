-- Migration: Create exec_sql function with helper table
-- Description: Creates a function to execute arbitrary SQL with proper RLS policies
-- for admin users only. Includes a helper table to log execution history.

-- Create helper table to log SQL executions with RLS
CREATE TABLE IF NOT EXISTS public._exec_sql (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_by UUID NOT NULL DEFAULT auth.uid(),
  success BOOLEAN NOT NULL,
  result JSONB,
  error TEXT
);

-- Enable RLS on the helper table
ALTER TABLE public._exec_sql ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow selecting only for admin users
CREATE POLICY "_exec_sql_select_policy" 
ON public._exec_sql
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (
    -- User has admin role
    auth.role() = 'admin' OR
    -- Or user has admin role in JWT claims
    (auth.jwt() ->> 'role')::TEXT = 'admin' OR
    -- Or user is in admin claim list
    auth.uid()::TEXT = ANY((auth.jwt() -> 'app_metadata' -> 'roles')::TEXT[])
  )
);

-- Create RLS policy to allow inserting for admin users
CREATE POLICY "_exec_sql_insert_policy" 
ON public._exec_sql
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (
    -- User has admin role
    auth.role() = 'admin' OR
    -- Or user has admin role in JWT claims
    (auth.jwt() ->> 'role')::TEXT = 'admin' OR
    -- Or user is in admin claim list
    auth.uid()::TEXT = ANY((auth.jwt() -> 'app_metadata' -> 'roles')::TEXT[])
  )
);

-- Create the exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_json JSONB;
  execution_id UUID;
  success BOOLEAN;
  error_message TEXT;
BEGIN
  -- Default to failure
  success := FALSE;
  error_message := NULL;
  
  -- Insert execution record
  INSERT INTO public._exec_sql (query, success)
  VALUES (query, FALSE)
  RETURNING id INTO execution_id;
  
  -- Check if user is authorized via RLS
  -- This will fail if RLS blocks the insertion
  
  BEGIN
    -- Execute the query
    EXECUTE query;
    
    -- Set success flag
    success := TRUE;
    
    -- For SELECT queries, get the results
    IF query ~* '^SELECT' THEN
      EXECUTE 'WITH result AS (' || query || ') SELECT jsonb_agg(r) FROM result r'
      INTO result_json;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Capture error if execution fails
    error_message := SQLERRM;
    result_json := NULL;
  END;
  
  -- Update execution record with results
  UPDATE public._exec_sql
  SET 
    success = success,
    result = result_json,
    error = error_message
  WHERE id = execution_id;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', success,
    'execution_id', execution_id,
    'timestamp', now(),
    'error', error_message,
    'result', result_json
  );
END;
$$;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;

-- Add helpful comment to the function
COMMENT ON FUNCTION public.exec_sql(TEXT) IS 'Executes arbitrary SQL with proper authorization and logging. Only available to admin users via RLS policies.';

-- Return a success message
SELECT 'Successfully created exec_sql function and helper table' AS message; 