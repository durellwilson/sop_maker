-- Create user_roles table for role-based access control
-- This separates role assignments from the main users table
-- for more flexible permission management

-- Create the user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure a user can only have one role entry
  CONSTRAINT user_roles_user_id_unique UNIQUE (user_id)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Create or replace a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Set up RLS (Row Level Security)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
-- Only allow users to see their own role or admins to see all roles
CREATE POLICY view_user_roles ON public.user_roles 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert/update/delete roles
CREATE POLICY manage_user_roles ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to get a user's role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = user_uuid;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment the table and columns
COMMENT ON TABLE public.user_roles IS 'User role assignments for access control';
COMMENT ON COLUMN public.user_roles.id IS 'Unique identifier for the role assignment';
COMMENT ON COLUMN public.user_roles.user_id IS 'Foreign key to the users table';
COMMENT ON COLUMN public.user_roles.role IS 'Role name (admin, editor, viewer)';
COMMENT ON COLUMN public.user_roles.created_at IS 'Timestamp when the role was assigned';
COMMENT ON COLUMN public.user_roles.updated_at IS 'Timestamp when the role was last updated';

-- Insert initial admin user if needed (customize this with your admin user ID)
-- This is commented out as you should run this manually with your specific user ID
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-admin-user-uuid', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin'; 