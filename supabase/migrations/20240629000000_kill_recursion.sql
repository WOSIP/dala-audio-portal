-- Migration: Final Recursion Killer
-- Description: Disables RLS and replaces recursive role check with a static one to recover the database.

-- 1. BREAK RECURSION
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.album_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchants DISABLE ROW LEVEL SECURITY;

-- 2. CLEAN UP POLICIES
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

-- 3. REPLACE FUNCTION WITH NON-DB VERSION
DROP FUNCTION IF EXISTS private.get_auth_role() CASCADE;

CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Superadmin bypass
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- Default to viewer for now to break all recursion
  RETURN 'viewer'::public.app_role;
END;
$$;

GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_role() TO authenticated, anon;

-- 4. RE-ENABLE BASIC PUBLIC ACCESS (NON-RECURSIVE)
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_public_read" ON public.albums FOR SELECT TO public USING (true);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comics_public_read" ON public.comics FOR SELECT TO public USING (true);

-- Profiles are also public read
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO public USING (true);