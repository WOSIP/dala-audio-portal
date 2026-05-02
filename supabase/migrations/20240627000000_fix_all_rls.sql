-- Migration: Final Access Control Fix
-- Description: Completely resets RLS policies for core tables to resolve recursion and performance issues.
-- Tables: profiles, user_roles, albums, comics, album_invitations

-- 1. Break RLS immediately to allow the migration to run even if there's recursion
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.album_invitations DISABLE ROW LEVEL SECURITY;

-- 2. Clean up all existing policies on these tables using a DO block
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'user_roles', 'albums', 'comics', 'album_invitations')
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Clean up functions
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS private.get_auth_role() CASCADE;

-- 4. Create a robust, non-recursive role checking function
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as owner (postgres), bypassing RLS
STABLE
SET search_path = '' -- Security best practice
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
  -- This is the fastest check and avoids any table lookups
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Fetch role and status from the database.
  -- Since we are SECURITY DEFINER, this query does NOT trigger RLS on profiles/user_roles.
  -- We use explicit schema qualification to be safe with search_path = ''.
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- Disabled users are demoted to viewers
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 5. Grant permissions
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon;

-- 6. RE-ENABLE RLS WITH CLEAN, SIMPLE POLICIES

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Public read access for everyone
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO public USING (true);
-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Admins can do anything
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Users can see their own role
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Admins can manage roles
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUMS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
-- Public read access for the portal
CREATE POLICY "albums_read_all" ON public.albums FOR SELECT TO public USING (true);
-- Admins can manage albums
CREATE POLICY "albums_admin_all" ON public.albums FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- COMICS
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
-- Public read access for the portal
CREATE POLICY "comics_read_all" ON public.comics FOR SELECT TO public USING (true);
-- Admins can manage comics
CREATE POLICY "comics_admin_all" ON public.comics FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUM_INVITATIONS
ALTER TABLE public.album_invitations ENABLE ROW LEVEL SECURITY;
-- Users can see invitations relevant to them (by email)
CREATE POLICY "album_invitations_read_own" ON public.album_invitations FOR SELECT TO public 
USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email') OR 
    private.get_auth_role() IN ('admin', 'superadmin')
);
-- Admins can manage invitations
CREATE POLICY "album_invitations_admin_all" ON public.album_invitations FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- 7. PERFORMANCE: Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_is_enabled ON public.profiles(is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_is_enabled ON public.albums(is_enabled);
CREATE INDEX IF NOT EXISTS idx_albums_privacy ON public.albums(privacy);
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);
CREATE INDEX IF NOT EXISTS idx_comics_enabled_deleted ON public.comics(enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_album_invitations_email ON public.album_invitations(LOWER(email));

-- 8. Force schema reload
NOTIFY pgrst, 'reload schema';