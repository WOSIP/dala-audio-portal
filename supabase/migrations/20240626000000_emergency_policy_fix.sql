-- Migration: Emergency Policy Fix (v2)
-- Description: Disables RLS temporarily to break recursion and sets up clean, robust policies.

-- BREAK RECURSION: Disable RLS on core tables first
-- We do this outside a transaction if possible or as the very first step
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;

-- CLEANUP
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
DROP POLICY IF EXISTS "albums_select_public" ON public.albums;
DROP POLICY IF EXISTS "comics_select_public" ON public.comics;
DROP POLICY IF EXISTS "albums_admin_all" ON public.albums;
DROP POLICY IF EXISTS "comics_admin_all" ON public.comics;

DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS private.get_auth_role() CASCADE;

-- SETUP
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_role public.app_role;
  v_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Guest access
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Superadmin bypass (Hardcoded email)
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Fetch role and status. 
  -- SECURITY DEFINER ensures we bypass RLS on these tables.
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- Disabled users get viewer role
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- PERMISSIONS
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon;

-- RE-ENABLE RLS WITH CLEAN POLICIES
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- Albums
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_select_public" ON public.albums FOR SELECT TO public USING (true);
CREATE POLICY "albums_admin_all" ON public.albums FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- Comics
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comics_select_public" ON public.comics FOR SELECT TO public USING (true);
CREATE POLICY "comics_admin_all" ON public.comics FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));