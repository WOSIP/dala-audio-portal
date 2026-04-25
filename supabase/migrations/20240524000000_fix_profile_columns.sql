-- Migration: Add full_name and is_enabled columns to profiles table
-- This addresses the error: could not find tfe "full_name" column of 'profile' in the schema cache

DO $$ 
BEGIN
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Add is_enabled if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;

    -- Add username if it doesn't exist (it was in the initial migration but might be missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- Populate full_name from name if name exists and full_name is null
UPDATE public.profiles 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';