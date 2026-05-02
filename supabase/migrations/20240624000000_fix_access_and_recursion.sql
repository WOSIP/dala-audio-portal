-- Migration: Final Access and Recursion Fix
-- Description: Solves the RLS recursion in user_roles/profiles, ensures enums are correct, and provides permissive portal access.

-- 1. Ensure the app_role enum is comprehensive
-- We use a DO block to add values safely
DO $$
BEGIN
    -- Check if 'superadmin' exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'superadmin') THEN
        ALTER TYPE public.app_role ADD VALUE 'superadmin';
    END IF;
    -- Check if 'role3' exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'role3') THEN
        ALTER TYPE public.app_role ADD VALUE 'role3';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. ROBUST get_auth_role function (Non-Recursive)
-- We mark it SECURITY DEFINER and ensure it's owned by a user that bypasses RLS (usually postgres)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role public.app_role;
  v_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- 1. Anonymous users are always viewers
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- 2. Check for the hardcoded superadmin bypass
  -- This avoids ANY table lookup for the primary admin
  IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- 3. Perform a single lookup for role and status
  -- Since this function is SECURITY DEFINER, it bypasses RLS on the tables it queries.
  -- This is the ONLY way to prevent recursion when policies for these tables call this function.
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- 4. If user is disabled, force viewer
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- 5. Return found role or default to viewer
  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 3. RESET RLS on critical tables to prevent recursion
-- We will use policies that do NOT call get_auth_role() if they are on the tables get_auth_role queries,
-- OR we trust that get_auth_role() being SECURITY DEFINER + bypassing RLS is enough.
-- To be safe, we simplify the policies on user_roles and profiles.

-- User Roles Policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and superadmins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (get_auth_role() IN ('admin', 'superadmin'));

-- Profiles Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins and superadmins can manage all profiles" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING (get_auth_role() IN ('admin', 'superadmin'));

-- 4. ENSURE ALBUMS AND COMICS ARE PUBLICLY READABLE (For the Portal)
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "albums_read_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_select_policy" ON public.albums;
CREATE POLICY "albums_select_public" ON public.albums FOR SELECT TO public USING (true);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comics_read_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_select_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_read_all_policy" ON public.comics;
CREATE POLICY "comics_select_public" ON public.comics FOR SELECT TO public USING (true);

-- 5. Ensure Storage is accessible
-- Check if comic_soundtracks bucket exists and has public select
INSERT INTO storage.buckets (id, name, public)
VALUES ('comic_soundtracks', 'comic_soundtracks', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public select on soundtracks" ON storage.objects;
CREATE POLICY "Public select on soundtracks" ON storage.objects FOR SELECT TO public USING (bucket_id = 'comic_soundtracks');

-- 6. Final Permissions Check
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Force Reload
NOTIFY pgrst, 'reload schema';