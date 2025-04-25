-- Enable RLS on all tables if not already enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.firebase_user_mapping ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;

DROP POLICY IF EXISTS "Users can view own SOPs" ON public.sops;
DROP POLICY IF EXISTS "Users can view published SOPs" ON public.sops;
DROP POLICY IF EXISTS "Users can update own SOPs" ON public.sops;
DROP POLICY IF EXISTS "Users can delete own SOPs" ON public.sops;
DROP POLICY IF EXISTS "Service role has full access to sops" ON public.sops;

DROP POLICY IF EXISTS "Users can view SOP steps" ON public.steps;
DROP POLICY IF EXISTS "Users can create SOP steps" ON public.steps;
DROP POLICY IF EXISTS "Users can update SOP steps" ON public.steps;
DROP POLICY IF EXISTS "Users can delete SOP steps" ON public.steps;
DROP POLICY IF EXISTS "Service role has full access to steps" ON public.steps;

DROP POLICY IF EXISTS "Users can view SOP media" ON public.media;
DROP POLICY IF EXISTS "Users can create SOP media" ON public.media;
DROP POLICY IF EXISTS "Users can update SOP media" ON public.media;
DROP POLICY IF EXISTS "Users can delete SOP media" ON public.media;
DROP POLICY IF EXISTS "Service role has full access to media" ON public.media;

DROP POLICY IF EXISTS "Allow users to read their own app_metadata" ON public.app_metadata;
DROP POLICY IF EXISTS "Allow users to update their own app_metadata" ON public.app_metadata;
DROP POLICY IF EXISTS "Service role can manage app_metadata" ON public.app_metadata;

DROP POLICY IF EXISTS "Allow users to read their own mapping" ON public.firebase_user_mapping;
DROP POLICY IF EXISTS "Service role can manage firebase_user_mapping" ON public.firebase_user_mapping;

-- Create policies for users table
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role has full access to users" ON public.users
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for sops table
CREATE POLICY "Users can view own SOPs" ON public.sops
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can view published SOPs" ON public.sops
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can update own SOPs" ON public.sops
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own SOPs" ON public.sops
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Users can create SOPs" ON public.sops
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role has full access to sops" ON public.sops
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for steps table
-- For steps, we need to join to sops to verify ownership
CREATE POLICY "Users can view SOP steps" ON public.steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sops 
      WHERE sops.id = steps.sop_id 
      AND (sops.created_by = auth.uid() OR sops.is_published = true)
    )
  );

CREATE POLICY "Users can create SOP steps" ON public.steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sops 
      WHERE sops.id = steps.sop_id 
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update SOP steps" ON public.steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sops 
      WHERE sops.id = steps.sop_id 
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete SOP steps" ON public.steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sops 
      WHERE sops.id = steps.sop_id 
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to steps" ON public.steps
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for media table
-- For media, we need to join to steps and sops to verify ownership
CREATE POLICY "Users can view SOP media" ON public.media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.steps
      JOIN public.sops ON steps.sop_id = sops.id
      WHERE steps.id = media.step_id
      AND (sops.created_by = auth.uid() OR sops.is_published = true)
    )
  );

CREATE POLICY "Users can create SOP media" ON public.media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.steps
      JOIN public.sops ON steps.sop_id = sops.id
      WHERE steps.id = media.step_id
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update SOP media" ON public.media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.steps
      JOIN public.sops ON steps.sop_id = sops.id
      WHERE steps.id = media.step_id
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete SOP media" ON public.media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.steps
      JOIN public.sops ON steps.sop_id = sops.id
      WHERE steps.id = media.step_id
      AND sops.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to media" ON public.media
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for app_metadata table
CREATE POLICY "Allow users to read their own app_metadata" ON public.app_metadata
  FOR SELECT USING (auth.uid() = supabase_uuid);

CREATE POLICY "Allow users to update their own app_metadata" ON public.app_metadata
  FOR UPDATE USING (auth.uid() = supabase_uuid);

CREATE POLICY "Allow users to insert their own app_metadata" ON public.app_metadata
  FOR INSERT WITH CHECK (auth.uid() = supabase_uuid);

CREATE POLICY "Service role can manage app_metadata" ON public.app_metadata
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for firebase_user_mapping table
CREATE POLICY "Allow users to read their own mapping" ON public.firebase_user_mapping
  FOR SELECT USING (auth.uid() = supabase_uuid);

CREATE POLICY "Service role can manage firebase_user_mapping" ON public.firebase_user_mapping
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Set search path for functions to fix security issues
ALTER FUNCTION IF EXISTS public.exec_sql(query text) 
SET search_path = public;

ALTER FUNCTION IF EXISTS public.function_exists(function_name text) 
SET search_path = public;

ALTER FUNCTION IF EXISTS public.get_user_id_from_auth() 
SET search_path = public;

ALTER FUNCTION IF EXISTS public.get_current_user_id() 
SET search_path = public;

ALTER FUNCTION IF EXISTS public.admin_create_storage_bucket(p_id text, p_name text, p_public boolean) 
SET search_path = public;

ALTER FUNCTION IF EXISTS public.get_service_role_bucket_policy(bucket_id text) 
SET search_path = public; 