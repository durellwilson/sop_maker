-- Migration: 004_firebase_auth_sync.sql
-- Sets up Firebase authentication sync with Supabase

-- Function to sync Firebase roles to Supabase
CREATE OR REPLACE FUNCTION public.sync_firebase_roles()
RETURNS TRIGGER AS $$
DECLARE
  firebase_roles TEXT[];
  role_mapping JSONB;
BEGIN
  -- Define the role mapping from Firebase to Supabase
  role_mapping := jsonb_build_object(
    'admin', '{supabase-admin,full_access}',
    'editor', '{editor,create,edit,view}',
    'viewer', '{viewer,view}'
  );

  -- Extract Firebase roles from metadata (if present)
  IF NEW.raw_user_meta_data ? 'firebase_roles' THEN
    firebase_roles := ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'firebase_roles'));
  ELSE
    firebase_roles := '{}';
  END IF;

  -- Create a new app_metadata structure with the mapped roles
  NEW.raw_app_meta_data := 
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('roles', 
      (SELECT jsonb_agg(DISTINCT r) 
       FROM (
         SELECT r
         FROM unnest(firebase_roles) AS fr
         CROSS JOIN LATERAL unnest(ARRAY(
           SELECT jsonb_array_elements_text(role_mapping->fr)
         )) AS r
         WHERE role_mapping ? fr
       ) AS sub
      )
    );

  -- If no roles were mapped, set a default 'viewer' role
  IF NOT (NEW.raw_app_meta_data->'roles' ? 'view') AND 
     NOT (NEW.raw_app_meta_data->'roles' ? 'edit') AND
     NOT (NEW.raw_app_meta_data->'roles' ? 'full_access') THEN
    NEW.raw_app_meta_data := NEW.raw_app_meta_data || 
      jsonb_build_object('roles', jsonb_build_array('viewer', 'view'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create triggers to sync roles on user creation and update
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_firebase_roles();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data->>'firebase_roles' IS DISTINCT FROM NEW.raw_user_meta_data->>'firebase_roles')
  EXECUTE FUNCTION public.sync_firebase_roles();

-- Function to fetch a user's mapped roles
CREATE OR REPLACE FUNCTION public.get_user_roles(uid UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(u.raw_app_meta_data->'roles')
  ) INTO user_roles
  FROM auth.users u
  WHERE u.id = uid;
  
  RETURN user_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = uid 
    AND raw_app_meta_data->'roles' ? role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a profile sync function to keep Firebase and Supabase user profiles in sync
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync only if the relevant user metadata fields have changed
  IF (OLD.raw_user_meta_data->>'displayName' IS DISTINCT FROM NEW.raw_user_meta_data->>'displayName') OR
     (OLD.raw_user_meta_data->>'photoURL' IS DISTINCT FROM NEW.raw_user_meta_data->>'photoURL') OR
     (OLD.raw_user_meta_data->>'email' IS DISTINCT FROM NEW.raw_user_meta_data->>'email') OR
     (OLD.raw_user_meta_data->>'firebase_uid' IS DISTINCT FROM NEW.raw_user_meta_data->>'firebase_uid') THEN
    
    -- Update user profile data
    NEW.raw_app_meta_data := 
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'display_name', NEW.raw_user_meta_data->>'displayName',
        'avatar_url', NEW.raw_user_meta_data->>'photoURL',
        'firebase_email', NEW.raw_user_meta_data->>'email'
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for syncing profile data
CREATE TRIGGER on_auth_user_profile_updated
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile(); 