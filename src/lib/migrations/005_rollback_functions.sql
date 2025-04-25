-- Migration: 005_rollback_functions.sql
-- Defines functions to rollback and undo any migration

-- Function to drop all SOP tables and related objects
CREATE OR REPLACE FUNCTION public.rollback_sop_schema()
RETURNS void AS $$
BEGIN
  -- Drop triggers
  DROP TRIGGER IF EXISTS update_sop_templates_updated_at ON public.sop_templates;
  DROP TRIGGER IF EXISTS update_user_sops_updated_at ON public.user_sops;
  DROP TRIGGER IF EXISTS update_sop_steps_updated_at ON public.sop_steps;
  DROP TRIGGER IF EXISTS update_sop_media_updated_at ON public.sop_media;
  
  -- Drop tables with CASCADE to remove related objects like constraints
  DROP TABLE IF EXISTS public.sop_media CASCADE;
  DROP TABLE IF EXISTS public.sop_steps CASCADE;
  DROP TABLE IF EXISTS public.user_sops CASCADE;
  DROP TABLE IF EXISTS public.sop_templates CASCADE;
  
  -- Drop the updated_at trigger function
  DROP FUNCTION IF EXISTS public.update_updated_at_column();
  
  -- Drop role-related functions
  DROP FUNCTION IF EXISTS public.is_admin(UUID);
  DROP FUNCTION IF EXISTS public.is_editor(UUID);
  DROP FUNCTION IF EXISTS public.match_user_id_with_firebase_uid(TEXT);
  DROP FUNCTION IF EXISTS public.get_user_roles(UUID);
  DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);
  
  -- Drop firebase sync functions and triggers
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_profile_updated ON auth.users;
  DROP FUNCTION IF EXISTS public.sync_firebase_roles();
  DROP FUNCTION IF EXISTS public.sync_user_profile();
  
  RAISE NOTICE 'Successfully dropped all SOP schema objects';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to selectively rollback migrations by name
CREATE OR REPLACE FUNCTION public.rollback_migration(migration_name TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := 'Unknown migration: ' || migration_name;
  
  IF migration_name = '001_create_sop_tables.sql' THEN
    -- Drop triggers first
    DROP TRIGGER IF EXISTS update_sop_templates_updated_at ON public.sop_templates;
    DROP TRIGGER IF EXISTS update_user_sops_updated_at ON public.user_sops;
    DROP TRIGGER IF EXISTS update_sop_steps_updated_at ON public.sop_steps;
    DROP TRIGGER IF EXISTS update_sop_media_updated_at ON public.sop_media;
    
    -- Drop tables
    DROP TABLE IF EXISTS public.sop_media;
    DROP TABLE IF EXISTS public.sop_steps;
    DROP TABLE IF EXISTS public.user_sops;
    DROP TABLE IF EXISTS public.sop_templates;
    
    -- Drop function
    DROP FUNCTION IF EXISTS public.update_updated_at_column();
    
    result := 'Successfully rolled back: ' || migration_name;
  ELSIF migration_name = '002_create_rls_policies.sql' THEN
    -- Drop policies
    DROP POLICY IF EXISTS create_sop_templates ON public.sop_templates;
    DROP POLICY IF EXISTS read_sop_templates ON public.sop_templates;
    DROP POLICY IF EXISTS update_sop_templates ON public.sop_templates;
    DROP POLICY IF EXISTS delete_sop_templates ON public.sop_templates;
    
    DROP POLICY IF EXISTS create_user_sops ON public.user_sops;
    DROP POLICY IF EXISTS read_user_sops ON public.user_sops;
    DROP POLICY IF EXISTS update_user_sops ON public.user_sops;
    DROP POLICY IF EXISTS delete_user_sops ON public.user_sops;
    
    DROP POLICY IF EXISTS manage_sop_steps ON public.sop_steps;
    DROP POLICY IF EXISTS manage_sop_media ON public.sop_media;
    
    -- Drop helper functions
    DROP FUNCTION IF EXISTS public.is_admin(UUID);
    DROP FUNCTION IF EXISTS public.is_editor(UUID);
    DROP FUNCTION IF EXISTS public.match_user_id_with_firebase_uid(TEXT);
    
    result := 'Successfully rolled back: ' || migration_name;
  ELSIF migration_name = '003_create_indexes.sql' THEN
    -- Drop all indexes
    DROP INDEX IF EXISTS public.idx_sop_templates_created_by;
    DROP INDEX IF EXISTS public.idx_sop_templates_is_public;
    DROP INDEX IF EXISTS public.idx_sop_templates_category;
    DROP INDEX IF EXISTS public.idx_sop_templates_status;
    DROP INDEX IF EXISTS public.idx_sop_templates_created_at;
    DROP INDEX IF EXISTS public.idx_sop_templates_tags;
    
    DROP INDEX IF EXISTS public.idx_user_sops_user_id;
    DROP INDEX IF EXISTS public.idx_user_sops_template_id;
    DROP INDEX IF EXISTS public.idx_user_sops_status;
    DROP INDEX IF EXISTS public.idx_user_sops_created_at;
    DROP INDEX IF EXISTS public.idx_user_sops_firebase_uid;
    DROP INDEX IF EXISTS public.idx_user_sops_user_id_status;
    DROP INDEX IF EXISTS public.idx_user_sops_user_id_created_at;
    
    DROP INDEX IF EXISTS public.idx_sop_steps_sop_id;
    DROP INDEX IF EXISTS public.idx_sop_steps_status;
    DROP INDEX IF EXISTS public.idx_sop_steps_sop_id_step_number;
    
    DROP INDEX IF EXISTS public.idx_sop_media_step_id;
    DROP INDEX IF EXISTS public.idx_sop_media_media_type;
    
    result := 'Successfully rolled back: ' || migration_name;
  ELSIF migration_name = '004_firebase_auth_sync.sql' THEN
    -- Drop triggers
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_profile_updated ON auth.users;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS public.sync_firebase_roles();
    DROP FUNCTION IF EXISTS public.sync_user_profile();
    DROP FUNCTION IF EXISTS public.get_user_roles(UUID);
    DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);
    
    result := 'Successfully rolled back: ' || migration_name;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check migration status
CREATE OR REPLACE FUNCTION public.check_applied_migrations()
RETURNS TABLE(migration_name TEXT, applied BOOLEAN) AS $$
DECLARE
  migrations TEXT[] := ARRAY[
    '001_create_sop_tables.sql',
    '002_create_rls_policies.sql',
    '003_create_indexes.sql',
    '004_firebase_auth_sync.sql',
    '005_rollback_functions.sql'
  ];
  m TEXT;
BEGIN
  -- Check if tables exist
  FOR m IN SELECT unnest(migrations) LOOP
    migration_name := m;
    
    IF m = '001_create_sop_tables.sql' THEN
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sop_templates'
      ) INTO applied;
    ELSIF m = '002_create_rls_policies.sql' THEN
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'is_admin'
      ) INTO applied;
    ELSIF m = '003_create_indexes.sql' THEN
      SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE indexname = 'idx_sop_templates_created_by'
      ) INTO applied;
    ELSIF m = '004_firebase_auth_sync.sql' THEN
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'sync_firebase_roles'
      ) INTO applied;
    ELSIF m = '005_rollback_functions.sql' THEN
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'rollback_migration'
      ) INTO applied;
    ELSE
      applied := FALSE;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 