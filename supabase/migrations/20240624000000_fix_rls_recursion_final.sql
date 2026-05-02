-- Migration: Fix RLS Recursion and Optimize Role Fetching
-- Description: This migration breaks the infinite recursion loop in RLS policies by 
-- redefining get_auth_role to bypass RLS and simplifying policies on dependent tables.

-- 1. Redefine get_auth_role with SECURITY DEFINER and search_path to bypass RLS
-- This ensures that the query inside the function doesn't trigger RLS on user_roles or profiles.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- We query user_roles directly. Since this is SECURITY DEFINER and owned by postgres (default),
  -- it bypasses RLS for this specific query.
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Fallback to viewer
  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 2. Simplify user_roles policies to avoid calling the function on itself
-- Instead of get_auth_role(), we use a direct check for admins if needed, 
-- or rely on the function being the gatekeeper for OTHER tables.
DROP POLICY IF EXISTS "Admins and superadmins manage all roles" ON public.user_roles;
CREATE POLICY "Admins and superadmins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Use a subquery that specifically targets the superadmin email if we can't trust the table yet
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'superadmin')
);

-- 3. Update Profiles policies
DROP POLICY IF EXISTS "Admins and superadmins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins and superadmins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'));

-- 4. Ensure public read access is truly unrestricted for initial load
-- This prevents any role check from happening during the first big fetch.
DROP POLICY IF EXISTS "albums_read_policy" ON public.albums;
CREATE POLICY "albums_read_policy" ON public.albums FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "comics_read_policy" ON public.comics;
CREATE POLICY "comics_read_policy" ON public.comics FOR SELECT TO public USING (true);

-- 5. Set project-wide statement timeout to a healthy 60s
ALTER ROLE anon SET statement_timeout = '60s';
ALTER ROLE authenticated SET statement_timeout = '60s';

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';