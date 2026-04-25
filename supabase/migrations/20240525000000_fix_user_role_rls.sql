-- Migration: Fix user_roles RLS violation
-- This migration ensures that admins can always manage roles and fixes the "new row violates row-level security policy" error.

-- 1. Robust get_auth_role function with email-based fallback for bootstrapping
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_email text;
BEGIN
  -- 1. Check user_roles table directly
  -- SECURITY DEFINER ensures we bypass RLS for this internal check
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Fallback to JWT email for designated superadmin
  -- This allows the first admin to create roles even if the table is empty
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'admin'::app_role;
  END IF;

  -- 3. Default fallback
  RETURN 'viewer'::app_role;
END;
$$;

-- 2. Update user_roles policies
-- Ensure the naming is consistent and covers all management actions
DROP POLICY IF EXISTS "Superadmins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Admins and superadmins can do everything
CREATE POLICY "Admins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

-- Users can still view their own role
-- This might already exist but we ensure it's here
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Bootstrap: Ensure the superadmin is actually in the user_roles table
-- This prevents relying solely on the JWT email fallback
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'kristalwos@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';