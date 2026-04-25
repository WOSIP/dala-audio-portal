-- Migration: Fix RLS policies for profile and role management
-- Description: Allows both 'admin' and 'superadmin' roles to manage profiles and user roles,
-- and ensures individual users can manage their own profiles.
-- Resolves "new row violates row-level security policy" errors for administrators.

-- 1. Profiles Table Policies
-- First, remove the existing restrictive policies
DROP POLICY IF EXISTS "Create profiles restricted" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles restricted" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and superadmins can manage all profiles" ON public.profiles;

-- Allow admins and superadmins full access to all profiles
CREATE POLICY "Admins and superadmins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

-- Allow individual users to manage their own profiles
-- SELECT is already covered by global view policies, but we ensure it here if needed.
-- Note: 'USING' is for existing rows (SELECT/UPDATE/DELETE), 'WITH CHECK' is for new rows (INSERT/UPDATE).

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- 2. User Roles Table Policies
-- Ensure admins and superadmins can manage roles
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and superadmins manage all roles" ON public.user_roles;

CREATE POLICY "Admins and superadmins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

-- Ensure users can view their own roles (important for the UI/get_auth_role check)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';