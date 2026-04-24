-- Migration: Final Fix for RLS Violations and Role Management
-- Description: Ensures all authorized roles (Superadmin, Role 3, Role 1, Role 2) can create content and fixes policy bugs.

-- 1. Make get_auth_role more robust with fallback for superadmin email
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
  -- 1. Check user_roles table
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Fallback: check email for known superadmin from JWT
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::app_role;
  END IF;

  -- 3. Default to viewer
  RETURN 'viewer'::app_role;
END;
$$;

-- 2. Ensure every existing user has a role, defaulting to role1 (creator) if not superadmin
-- This fixes the empty user_roles table issue
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN LOWER(email) = 'kristalwos@gmail.com' THEN 'superadmin'::app_role 
    ELSE 'role1'::app_role 
  END
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET 
  role = EXCLUDED.role 
  WHERE public.user_roles.role = 'viewer'::app_role;

-- 3. Create a trigger to automatically assign roles to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    CASE 
      WHEN LOWER(new.email) = 'kristalwos@gmail.com' THEN 'superadmin'::app_role
      ELSE 'role1'::app_role -- Default to creator role
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 4. Re-apply ALBUMS policies with fixes for the invitation subquery
DROP POLICY IF EXISTS "Manage albums high roles" ON public.albums;
DROP POLICY IF EXISTS "Create albums role 1 and 2" ON public.albums;
DROP POLICY IF EXISTS "Manage own albums role 1 and 2" ON public.albums;
DROP POLICY IF EXISTS "Select albums access" ON public.albums;

-- Superadmin, Admin, Role 3: Full access
CREATE POLICY "Manage albums high roles" 
ON public.albums 
FOR ALL 
TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role));

-- Role 1 and 2: Create albums
CREATE POLICY "Create albums role 1 and 2" 
ON public.albums 
FOR INSERT 
TO authenticated 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  (owner_id IS NULL OR owner_id = auth.uid())
);

-- Role 1 and 2: Manage own albums
CREATE POLICY "Manage own albums role 1 and 2" 
ON public.albums 
FOR ALL 
TO authenticated 
USING (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  owner_id = auth.uid()
) 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  owner_id = auth.uid()
);

-- Universal SELECT: Fix the qualified join
CREATE POLICY "Select albums access" 
ON public.albums 
FOR SELECT 
TO public 
USING (
  privacy = 'public'::privacy_status OR 
  (auth.role() = 'authenticated' AND (
    get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.album_invitations 
      WHERE album_invitations.album_id = public.albums.id 
      AND album_invitations.email = (auth.jwt() ->> 'email') 
      AND album_invitations.enabled = true
    )
  ))
);

-- 5. Re-apply COMICS (Episodes) policies
DROP POLICY IF EXISTS "Manage comics high roles" ON public.comics;
DROP POLICY IF EXISTS "Create comics in own albums role 1 and 2" ON public.comics;
DROP POLICY IF EXISTS "Manage own comics role 1 and 2" ON public.comics;
DROP POLICY IF EXISTS "Select comics access" ON public.comics;

-- Superadmin, Admin, Role 3: Full access
CREATE POLICY "Manage comics high roles" 
ON public.comics 
FOR ALL 
TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role));

-- Role 1 and 2: Create comics in own albums
CREATE POLICY "Create comics in own albums role 1 and 2" 
ON public.comics 
FOR INSERT 
TO authenticated 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
);

-- Role 1 and 2: Manage own comics
CREATE POLICY "Manage own comics role 1 and 2" 
ON public.comics 
FOR ALL 
TO authenticated 
USING (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
) 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
);

-- Universal SELECT
CREATE POLICY "Select comics access" 
ON public.comics 
FOR SELECT 
TO public 
USING (
  get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
  get_album_owner(album_id) = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE id = comics.album_id AND (
      privacy = 'public'::privacy_status OR 
      EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_invitations.album_id = public.albums.id 
        AND album_invitations.email = (auth.jwt() ->> 'email') 
        AND album_invitations.enabled = true
      )
    )
  )
);