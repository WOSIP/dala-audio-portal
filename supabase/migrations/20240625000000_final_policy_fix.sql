-- Migration: Final Database Policy Fix
-- Description: Solves the RLS recursion by using a private schema and security definer functions correctly.
-- Also ensures public access to albums and comics for the portal.

-- 1. Create a private schema for security functions
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create the role fetching function in the private schema
-- This function is SECURITY DEFINER, meaning it runs with the privileges of the creator (postgres).
-- Since postgres bypasses RLS, this function will NOT trigger RLS when it queries profiles or user_roles.
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = '' -- Best practice for security definer
AS $$
DECLARE
  v_user_id uuid;
  v_role public.app_role;
  v_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Anonymous users are viewers
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Hardcoded superadmin bypass
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Perform lookup bypassing RLS on public.profiles and public.user_roles
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- Default to viewer if disabled or not found
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 3. Simplify and fix Policies on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;

-- Anyone can view profiles (needed for the app)
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO public USING (true);
-- Users can update their own
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Admins can do anything
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING ((SELECT private.get_auth_role()) IN ('admin', 'superadmin'));

-- 4. Simplify and fix Policies on User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

-- Users can see their own roles
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Admins manage all roles
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING ((SELECT private.get_auth_role()) IN ('admin', 'superadmin'));

-- 5. Ensure Albums and Comics are public
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "albums_select_public" ON public.albums;
DROP POLICY IF EXISTS "albums_read_policy" ON public.albums;
CREATE POLICY "albums_select_public" ON public.albums FOR SELECT TO public USING (true);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comics_select_public" ON public.comics;
DROP POLICY IF EXISTS "comics_read_policy" ON public.comics;
CREATE POLICY "comics_select_public" ON public.comics FOR SELECT TO public USING (true);

-- 6. Storage Bucket Access
INSERT INTO storage.buckets (id, name, public)
VALUES ('comic_soundtracks', 'comic_soundtracks', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public select on soundtracks" ON storage.objects;
CREATE POLICY "Public select on soundtracks" ON storage.objects FOR SELECT TO public USING (bucket_id = 'comic_soundtracks');

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon;

-- 8. Final attempt to clear old problematic function from public schema
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;