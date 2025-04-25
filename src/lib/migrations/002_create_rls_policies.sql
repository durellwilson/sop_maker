-- Migration: 002_create_rls_policies.sql
-- Defines Row Level Security policies for SOP tables

-- Helper function to check user roles
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Implement admin check logic here
  -- This is a placeholder - you'll need to connect this to your Firebase roles
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = uid AND raw_app_meta_data->>'roles' ? 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_editor(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Implement editor check logic here
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = uid AND (
      raw_app_meta_data->>'roles' ? 'editor' OR
      raw_app_meta_data->>'roles' ? 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to match Firebase UID with Supabase UID
CREATE OR REPLACE FUNCTION public.match_user_id_with_firebase_uid(firebase_uid TEXT)
RETURNS UUID AS $$
DECLARE
  supabase_uid UUID;
BEGIN
  SELECT id INTO supabase_uid
  FROM auth.users
  WHERE raw_user_meta_data->>'firebase_uid' = firebase_uid;
  
  RETURN supabase_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SOP Templates policies

-- Admin or editor can create templates
CREATE POLICY create_sop_templates ON public.sop_templates
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR 
  is_editor(auth.uid())
);

-- Anyone can view public templates, admins/editors can view all
CREATE POLICY read_sop_templates ON public.sop_templates
FOR SELECT TO authenticated
USING (
  is_public = TRUE OR 
  is_admin(auth.uid()) OR 
  is_editor(auth.uid()) OR
  created_by = auth.uid()
);

-- Admin or editor can update templates they created or any public template
CREATE POLICY update_sop_templates ON public.sop_templates
FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND (is_admin(auth.uid()) OR is_editor(auth.uid()))) OR
  (is_admin(auth.uid()))
)
WITH CHECK (
  (created_by = auth.uid() AND (is_admin(auth.uid()) OR is_editor(auth.uid()))) OR
  (is_admin(auth.uid()))
);

-- Only admins can delete templates
CREATE POLICY delete_sop_templates ON public.sop_templates
FOR DELETE TO authenticated
USING (
  is_admin(auth.uid())
);

-- User SOPs policies

-- Any authenticated user can create their own SOPs
CREATE POLICY create_user_sops ON public.user_sops
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Users can view their own SOPs, admins can view all
CREATE POLICY read_user_sops ON public.user_sops
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  is_admin(auth.uid()) OR
  is_editor(auth.uid())
);

-- Users can update their own SOPs, admins/editors can help
CREATE POLICY update_user_sops ON public.user_sops
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  is_admin(auth.uid()) OR
  is_editor(auth.uid())
)
WITH CHECK (
  user_id = auth.uid() OR
  is_admin(auth.uid()) OR
  is_editor(auth.uid())
);

-- Users can delete their own SOPs, admins can delete any
CREATE POLICY delete_user_sops ON public.user_sops
FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR
  is_admin(auth.uid())
);

-- SOP Steps policies

-- Users can manage steps for their own SOPs
CREATE POLICY manage_sop_steps ON public.sop_steps
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sops
    WHERE id = sop_id AND (user_id = auth.uid() OR is_admin(auth.uid()) OR is_editor(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_sops
    WHERE id = sop_id AND (user_id = auth.uid() OR is_admin(auth.uid()) OR is_editor(auth.uid()))
  )
);

-- SOP Media policies

-- Users can manage media for their own SOP steps
CREATE POLICY manage_sop_media ON public.sop_media
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sop_steps s
    JOIN public.user_sops u ON s.sop_id = u.id
    WHERE s.id = step_id AND (u.user_id = auth.uid() OR is_admin(auth.uid()) OR is_editor(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sop_steps s
    JOIN public.user_sops u ON s.sop_id = u.id
    WHERE s.id = step_id AND (u.user_id = auth.uid() OR is_admin(auth.uid()) OR is_editor(auth.uid()))
  )
); 