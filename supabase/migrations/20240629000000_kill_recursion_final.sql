-- Migration: Recursive RLS & Data Loading Fix (Final Emergency)
-- Description: Completely resets RLS, cleans up recursive functions, and ensures stable public access.

-- 1. BREAK RECURSION: Disable RLS immediately on all possible targets
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.album_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchants DISABLE ROW LEVEL SECURITY;

-- 2. ENSURE ENUM VALUES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer', 'superadmin');
    ELSE
        -- Add superadmin if it doesn't exist in the enum
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'superadmin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 3. DROP ALL LINGERING POLICIES (Aggressive Cleanup)
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

-- 4. DROP ALL VERSIONS OF THE ROLE FUNCTION
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS private.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;

-- 5. CREATE CLEAN PRIVATE SCHEMA AND FUNCTION
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
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

  -- Superadmin bypass via email
  v_email := auth.jwt() ->> 'email';
  IF v_email = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Lookup in public tables (schema qualified to avoid search_path issues)
  -- SECURITY DEFINER + postgres owner = bypass RLS on profiles/user_roles
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- Logic
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

ALTER FUNCTION private.get_auth_role() OWNER TO postgres;

GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon;

-- 6. RE-ENABLE RLS WITH SEPARATE SELECT POLICIES
-- This pattern ensures SELECT is always fast and non-recursive.

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUMS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_select_public" ON public.albums FOR SELECT TO public USING (true);
CREATE POLICY "albums_admin_all" ON public.albums FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- COMICS
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comics_select_public" ON public.comics FOR SELECT TO public USING (true);
CREATE POLICY "comics_admin_all" ON public.comics FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- ALBUM_INVITATIONS
ALTER TABLE public.album_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "album_invitations_select" ON public.album_invitations FOR SELECT TO public 
USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email') OR 
    private.get_auth_role() IN ('admin', 'superadmin')
);
CREATE POLICY "album_invitations_admin_all" ON public.album_invitations FOR ALL TO authenticated 
USING (private.get_auth_role() IN ('admin', 'superadmin'));

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_id_enabled ON public.profiles(id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_albums_is_enabled ON public.albums(is_enabled);
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);

-- 8. RELOAD
NOTIFY pgrst, 'reload schema';