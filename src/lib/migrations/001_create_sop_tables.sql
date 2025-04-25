-- Migration: 001_create_sop_tables.sql
-- Creates the initial schema for SOP (Standard Operating Procedure) tables

-- Enable RLS
ALTER TABLE IF EXISTS public.sop_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sops DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sop_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sop_media DISABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS public.sop_media;
DROP TABLE IF EXISTS public.sop_steps;
DROP TABLE IF EXISTS public.user_sops;
DROP TABLE IF EXISTS public.sop_templates;

-- Create SOP Templates table
CREATE TABLE public.sop_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft'
);

-- Create User SOPs table
CREATE TABLE public.user_sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.sop_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    firebase_uid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'in_progress',
    version INTEGER DEFAULT 1,
    is_template_modified BOOLEAN DEFAULT FALSE
);

-- Create SOP Steps table
CREATE TABLE public.sop_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id UUID REFERENCES public.user_sops(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    step_number INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    estimated_time_minutes INTEGER,
    notes TEXT
);

-- Create SOP Media table
CREATE TABLE public.sop_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID REFERENCES public.sop_steps(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    storage_bucket TEXT DEFAULT 'sop-media',
    content_type TEXT,
    size_bytes INTEGER,
    is_public BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_media ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sop_templates_updated_at
BEFORE UPDATE ON public.sop_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_sops_updated_at
BEFORE UPDATE ON public.user_sops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sop_steps_updated_at
BEFORE UPDATE ON public.sop_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sop_media_updated_at
BEFORE UPDATE ON public.sop_media
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 