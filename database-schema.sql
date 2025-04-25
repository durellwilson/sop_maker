-- Database schema for SOP Maker application

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOPs table
CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Steps table
CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  video_script TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'document')),
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS sops_created_by_idx ON sops(created_by);
CREATE INDEX IF NOT EXISTS steps_sop_id_idx ON steps(sop_id);
CREATE INDEX IF NOT EXISTS steps_order_index_idx ON steps(sop_id, order_index);
CREATE INDEX IF NOT EXISTS media_step_id_idx ON media(step_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_sops_timestamp
BEFORE UPDATE ON sops
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_steps_timestamp
BEFORE UPDATE ON steps
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

-- Set up Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- SOPs policies
CREATE POLICY "Users can read their own SOPs"
  ON sops FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own SOPs"
  ON sops FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own SOPs"
  ON sops FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own SOPs"
  ON sops FOR DELETE
  USING (auth.uid() = created_by);

-- Steps policies
CREATE POLICY "Users can read steps of their SOPs"
  ON steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sops WHERE sops.id = steps.sop_id AND sops.created_by = auth.uid()
  ));

CREATE POLICY "Users can create steps for their SOPs"
  ON steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM sops WHERE sops.id = steps.sop_id AND sops.created_by = auth.uid()
  ));

CREATE POLICY "Users can update steps of their SOPs"
  ON steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM sops WHERE sops.id = steps.sop_id AND sops.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete steps of their SOPs"
  ON steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM sops WHERE sops.id = steps.sop_id AND sops.created_by = auth.uid()
  ));

-- Media policies
CREATE POLICY "Users can read media of their SOPs"
  ON media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM steps 
    JOIN sops ON steps.sop_id = sops.id 
    WHERE media.step_id = steps.id AND sops.created_by = auth.uid()
  ));

CREATE POLICY "Users can create media for their SOPs"
  ON media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM steps 
    JOIN sops ON steps.sop_id = sops.id 
    WHERE media.step_id = steps.id AND sops.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete media of their SOPs"
  ON media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM steps 
    JOIN sops ON steps.sop_id = sops.id 
    WHERE media.step_id = steps.id AND sops.created_by = auth.uid()
  ));

-- Function to create user record after auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, firebase_uid, email, name)
  VALUES (
    NEW.id,
    NEW.id, -- Use the same ID for both initially
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'displayName', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record after auth.user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to get user by ID (avoiding UUID casting)
CREATE OR REPLACE FUNCTION get_user_by_id(user_id TEXT)
RETURNS TABLE (
  id TEXT,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.created_at, u.updated_at
  FROM users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 