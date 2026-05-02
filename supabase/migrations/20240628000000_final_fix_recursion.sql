-- Migration: Comprehensive Access Control & Performance Fix (V2.1)
-- Description: Robustly resets RLS to break recursion loops and ensures performant data loading.
-- Optimized with explicit search paths and security definer functions.

-- 1. BREAK RECURSION IMMEDIATELY
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.album_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchants DISABLE ROW LEVEL SECURITY;

-- 2. CLEAN UP ALL POLICIES DYNAMICALLY
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'user_roles', 'albums', 'comics', 'album_invitations', 'merchants')
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. CLEAN UP PROBLEMATIC FUNCTIONS
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS private.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- 4. CREATE ROBUST SECURITY SCHEMA
CREATE SCHEMA IF NOT EXISTS private;

-- 5. CREATE NON-RECURSIVE ROLE FETCHING FUNCTION
-- Marked SECURITY DEFINER and STABLE for performance and recursion avoidance.
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_role public.app_role;
  v_enabled boolean;
  v_email text;
BEGIN
  v_user_id := auth.uid();
  
  -- Guest access
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Superadmin bypass check (Email based)
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Perform lookup on core tables
  -- Note: Since this is SECURITY DEFINER, it bypasses RLS on profiles/user_roles internally.
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- Handle disabled users
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Return found role or default to viewer
  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 6. GRANT NECESSARY PERMISSIONS
GRANT USAGE ON SCHEMA private TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon, public;

-- 7. RE-ENABLE RLS WITH CLEAN, SIMPLE POLICIES

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_write_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUMS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_read_all" ON public.albums FOR SELECT TO public USING (true);
CREATE POLICY "albums_admin_all" ON public.albums FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- COMICS
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comics_read_all" ON public.comics FOR SELECT TO public USING (true);
CREATE POLICY "comics_admin_all" ON public.comics FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUM_INVITATIONS
ALTER TABLE public.album_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "album_invitations_read_own" ON public.album_invitations FOR SELECT TO public 
USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email') OR 
    private.get_auth_role() IN ('admin', 'superadmin')
);
CREATE POLICY "album_invitations_admin_all" ON public.album_invitations FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- MERCHANTS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchants_read_all" ON public.merchants FOR SELECT TO public USING (true);
CREATE POLICY "merchants_admin_all" ON public.merchants FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- 8. PERFORMANCE OPTIMIZATION: Ensure critical indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_is_enabled ON public.profiles(is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_owner_id ON public.albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_albums_is_enabled ON public.albums(is_enabled);
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);
CREATE INDEX IF NOT EXISTS idx_comics_enabled_deleted ON public.comics(enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_album_invitations_email_lower ON public.album_invitations(LOWER(email));

-- 9. SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';