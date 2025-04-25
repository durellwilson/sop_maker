-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.app_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firebase_user_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies for app_metadata
CREATE POLICY "Allow users to read their own app_metadata"
  ON public.app_metadata
  FOR SELECT
  USING (auth.uid() = supabase_uuid);

CREATE POLICY "Allow users to update their own app_metadata"
  ON public.app_metadata
  FOR UPDATE
  USING (auth.uid() = supabase_uuid);

-- Create policies for firebase_user_mapping
CREATE POLICY "Allow users to read their own mapping"
  ON public.firebase_user_mapping
  FOR SELECT
  USING (auth.uid() = supabase_uuid);

-- Add service role access policies for both tables
CREATE POLICY "Service role can manage app_metadata"
  ON public.app_metadata
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage firebase_user_mapping"
  ON public.firebase_user_mapping
  USING (auth.jwt() ->> 'role' = 'service_role'); 