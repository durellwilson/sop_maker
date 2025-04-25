-- Create the step_media table to store media files (images, videos, documents) attached to steps
CREATE TABLE IF NOT EXISTS step_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT valid_file_type CHECK (file_type IN ('image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'))
);

-- Add indexes
CREATE INDEX step_media_step_id_idx ON step_media(step_id);
CREATE INDEX step_media_file_type_idx ON step_media(file_type);

-- Add RLS policies
ALTER TABLE step_media ENABLE ROW LEVEL SECURITY;

-- Function to check if user owns the SOP that contains this step
CREATE OR REPLACE FUNCTION public.user_owns_step_media(media_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sop_owner_id UUID;
BEGIN
  SELECT s.user_id INTO sop_owner_id
  FROM step_media sm
  JOIN steps st ON sm.step_id = st.id
  JOIN sops s ON st.sop_id = s.id
  WHERE sm.id = media_id;
  
  RETURN (auth.uid() = sop_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
CREATE POLICY "Allow users to view step media they own"
  ON step_media
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM steps st
    JOIN sops s ON st.sop_id = s.id
    WHERE step_media.step_id = st.id
    AND s.user_id = auth.uid()
  ));

CREATE POLICY "Allow users to insert step media for their steps"
  ON step_media
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM steps st
    JOIN sops s ON st.sop_id = s.id
    WHERE step_media.step_id = st.id
    AND s.user_id = auth.uid()
  ));

CREATE POLICY "Allow users to update their own step media"
  ON step_media
  FOR UPDATE
  USING (user_owns_step_media(id))
  WITH CHECK (user_owns_step_media(id));

CREATE POLICY "Allow users to delete their own step media"
  ON step_media
  FOR DELETE
  USING (user_owns_step_media(id));

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON step_media
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp(); 