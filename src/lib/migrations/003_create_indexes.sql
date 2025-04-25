-- Migration: 003_create_indexes.sql
-- Creates indexes for optimizing query performance

-- Indexes for SOP Templates table
CREATE INDEX IF NOT EXISTS idx_sop_templates_created_by ON public.sop_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_sop_templates_is_public ON public.sop_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_sop_templates_category ON public.sop_templates(category);
CREATE INDEX IF NOT EXISTS idx_sop_templates_status ON public.sop_templates(status);
CREATE INDEX IF NOT EXISTS idx_sop_templates_created_at ON public.sop_templates(created_at DESC);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_sop_templates_tags ON public.sop_templates USING GIN (tags);

-- Indexes for User SOPs table
CREATE INDEX IF NOT EXISTS idx_user_sops_user_id ON public.user_sops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sops_template_id ON public.user_sops(template_id);
CREATE INDEX IF NOT EXISTS idx_user_sops_status ON public.user_sops(status);
CREATE INDEX IF NOT EXISTS idx_user_sops_created_at ON public.user_sops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sops_firebase_uid ON public.user_sops(firebase_uid);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_sops_user_id_status ON public.user_sops(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_sops_user_id_created_at ON public.user_sops(user_id, created_at DESC);

-- Indexes for SOP Steps table
CREATE INDEX IF NOT EXISTS idx_sop_steps_sop_id ON public.sop_steps(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_steps_status ON public.sop_steps(status);
CREATE INDEX IF NOT EXISTS idx_sop_steps_sop_id_step_number ON public.sop_steps(sop_id, step_number);

-- Indexes for SOP Media table
CREATE INDEX IF NOT EXISTS idx_sop_media_step_id ON public.sop_media(step_id);
CREATE INDEX IF NOT EXISTS idx_sop_media_media_type ON public.sop_media(media_type);

-- Add comment explaining index strategy
COMMENT ON INDEX public.idx_sop_templates_created_by IS 'Optimizes queries filtering by template creator';
COMMENT ON INDEX public.idx_user_sops_user_id_status IS 'Optimizes queries for user SOPs filtered by status';
COMMENT ON INDEX public.idx_sop_steps_sop_id_step_number IS 'Optimizes ordering of steps by step number for a specific SOP';

-- Analyze tables to update statistics
ANALYZE public.sop_templates;
ANALYZE public.user_sops;
ANALYZE public.sop_steps;
ANALYZE public.sop_media; 