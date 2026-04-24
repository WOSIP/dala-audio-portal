-- Migration: Fix permissions for Kristalwos@gmail.com and align roles
-- Fixes the issue where album creation was failing due to role name mismatch

-- 1. Correct the trigger function to use 'superadmin' instead of 'admin'
-- This ensures future signups of this email get the right role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (LOWER(new.email) = 'kristalwos@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'superadmin'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin'::app_role;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'viewer'::app_role)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

-- 2. Promote Kristalwos@gmail.com to superadmin safely
-- We iterate through profiles and try to insert into user_roles, catching FK violations
DO $$
DECLARE
    p_rec RECORD;
BEGIN
    FOR p_rec IN SELECT id, email FROM public.profiles WHERE LOWER(email) = 'kristalwos@gmail.com' LOOP
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (p_rec.id, 'superadmin'::app_role)
            ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin'::app_role;
        EXCEPTION WHEN foreign_key_violation THEN
            -- Skip profiles that don't have a matching user in auth.users
            CONTINUE;
        END;
    END LOOP;
END $$;

-- 3. Also fix ANY existing roles that were set to 'admin' (from old migrations) to 'superadmin'
-- This aligns the DB state with the app's expectations
UPDATE public.user_roles SET role = 'superadmin'::app_role WHERE role = 'admin'::app_role;

-- 4. Ensure RLS on albums allows superadmin and role3 for INSERT
DROP POLICY IF EXISTS "Create albums restricted" ON public.albums;
CREATE POLICY "Create albums restricted"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

-- 5. Fix other album policies for consistency
DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
CREATE POLICY "Admins and editors can manage albums"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

-- Ensure owners can also update their own albums if they are role1/role2 (as per AdminPanel logic)
DROP POLICY IF EXISTS "Owners can update their albums" ON public.albums;
CREATE POLICY "Owners can update their albums"
ON public.albums
FOR UPDATE
TO authenticated
USING (
  get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role) OR 
  (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND owner_id = auth.uid())
)
WITH CHECK (
  get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role) OR 
  (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND owner_id = auth.uid())
);