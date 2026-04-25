-- Fix Database Querying Schema
-- This migration ensures the profiles table and user_permissions view are consistent and have all necessary columns.

-- 1. ADD MISSING COLUMNS TO profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. ADD MISSING COLUMNS TO user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. RECREATE user_permissions VIEW
-- We drop and recreate it to ensure it has all the latest columns from profiles and user_roles
DROP VIEW IF EXISTS public.user_permissions;

CREATE VIEW public.user_permissions AS
SELECT 
    ur.id AS role_record_id,
    ur.user_id,
    ur.role,
    ur.created_at AS role_created_at,
    p.id AS profile_id,
    p.full_name AS name,
    p.email,
    p.avatar_url,
    p.is_enabled,
    p.created_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id;

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';