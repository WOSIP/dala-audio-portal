-- Migration: Recovery and Recursion Fix
-- Description: Disables RLS on locked tables and replaces the role function with a non-recursive version.
-- This is intended to recover a database stuck in a recursion loop.

-- 1. Break recursion immediately
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.album_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchants DISABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies
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

-- 3. Replace recursive function with a static one
-- This version does NOT query the database, ensuring no recursion is possible.
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS text 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Superadmin bypass (matches kristalwos@gmail.com)
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin';
  END IF;

  RETURN 'viewer';
END;
$$;

-- 4. Restore basic public access
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_public_read_v3" ON public.albums FOR SELECT TO public USING (true);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comics_public_read_v3" ON public.comics FOR SELECT TO public USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read_v3" ON public.profiles FOR SELECT TO public USING (true);

-- 5. Notify PostgREST to refresh schema
NOTIFY pgrst, 'reload schema';