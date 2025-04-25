-- Add new columns to the SOP table
ALTER TABLE IF EXISTS sops ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE IF EXISTS sops ADD COLUMN IF NOT EXISTS stakeholders TEXT;
ALTER TABLE IF EXISTS sops ADD COLUMN IF NOT EXISTS definitions TEXT;

-- Add new fields to the steps table
ALTER TABLE IF EXISTS steps ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE IF EXISTS steps ADD COLUMN IF NOT EXISTS safety_notes TEXT;
ALTER TABLE IF EXISTS steps ADD COLUMN IF NOT EXISTS verification TEXT;

-- Create shared_sops table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_sops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS shared_sops_sop_id_idx ON shared_sops(sop_id);
