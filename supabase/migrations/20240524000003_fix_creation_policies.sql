-- Migration: Fix Episode and Album Creation Permissions
-- Description: Ensures Superadmin, Role 3, and other appropriate roles can create albums and episodes.
-- Also fixes the missing INSERT permissions for Role 1 and Role 2 for their own content.

-- 1. Ensure the user_roles table and get_auth_role function are robust
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Security definer bypasses RLS on user_roles
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'viewer'::app_role);
END;
$$;

-- 2. ALBUMS Policies cleanup and fix
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Superadmin and Role 3 manage albums" ON public.albums;
    DROP POLICY IF EXISTS "Role 1 and 2 update own albums" ON public.albums;
    DROP POLICY IF EXISTS "Select albums access" ON public.albums;
    DROP POLICY IF EXISTS "Allow album creation for authorized roles" ON public.albums;
    DROP POLICY IF EXISTS "Allow album management for high roles" ON public.albums;
END $$;

-- Full management access for Superadmin, Admin, and Role 3
CREATE POLICY "Manage albums high roles" 
ON public.albums 
FOR ALL 
TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role));

-- Role 1 and 2 can CREATE albums (their own)
CREATE POLICY "Create albums role 1 and 2" 
ON public.albums 
FOR INSERT 
TO authenticated 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  (owner_id IS NULL OR owner_id = auth.uid())
);

-- Role 1 and 2 can UPDATE and DELETE their own albums
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

-- Universal SELECT policy for albums (improved)
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
      WHERE album_id = id AND email = (auth.jwt() ->> 'email') AND enabled = true
    )
  ))
);

-- 3. COMICS (Episodes) Policies cleanup and fix
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Superadmin and Role 3 manage comics" ON public.comics;
    DROP POLICY IF EXISTS "Role 1 and 2 update comics in own albums" ON public.comics;
    DROP POLICY IF EXISTS "Select comics access" ON public.comics;
END $$;

-- Full management access for Superadmin, Admin, and Role 3
CREATE POLICY "Manage comics high roles" 
ON public.comics 
FOR ALL 
TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'role3'::app_role));

-- Role 1 and 2 can CREATE comics in their own albums
CREATE POLICY "Create comics in own albums role 1 and 2" 
ON public.comics 
FOR INSERT 
TO authenticated 
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
);

-- Role 1 and 2 can UPDATE and DELETE their own comics
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

-- Universal SELECT policy for comics (improved)
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
        WHERE album_id = albums.id AND email = (auth.jwt() ->> 'email') AND enabled = true
      )
    )
  )
);

-- 4. Fix potential missing user_roles for existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::app_role
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Ensure kristalwos@gmail.com is superadmin if they exist
UPDATE public.user_roles 
SET role = 'superadmin'::app_role 
WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = 'kristalwos@gmail.com');