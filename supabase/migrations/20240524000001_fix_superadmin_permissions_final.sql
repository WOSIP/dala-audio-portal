-- Migration: Fix Superadmin Album Creation and Permission Violations
-- Description: Ensures superadmins have unrestricted access and fixes RLS policy mismatches.

-- 1. Update user_roles policies to recognize 'superadmin' role
-- This is critical for the Admin Panel to function correctly for superadmins
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins and superadmins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role));

CREATE POLICY "Admins and superadmins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role))
WITH CHECK (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role));

-- 2. Consolidate and fix Albums policies
-- We drop existing policies to ensure no conflicts or redundant restrictions
DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
DROP POLICY IF EXISTS "Create albums restricted" ON public.albums;
DROP POLICY IF EXISTS "Delete albums restricted" ON public.albums;
DROP POLICY IF EXISTS "Owners can update their albums" ON public.albums;
DROP POLICY IF EXISTS "Update albums restricted" ON public.albums;
DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;
DROP POLICY IF EXISTS "View albums based on role" ON public.albums;
DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
DROP POLICY IF EXISTS "Invited users can view private albums" ON public.albums;

-- FULL ACCESS for Superadmins and Role 3
CREATE POLICY "Superadmin and Role 3 full access on albums"
ON public.albums
FOR ALL 
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

-- UPDATE access for Role 1 and Role 2 (Owners only)
CREATE POLICY "Role 1 and 2 update own albums"
ON public.albums
FOR UPDATE
TO authenticated
USING (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  owner_id = auth.uid()
)
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  owner_id = auth.uid()
);

-- SELECT access for everyone (Public or Authorized)
CREATE POLICY "General select access for albums"
ON public.albums
FOR SELECT
TO public
USING (
  privacy = 'public'::privacy_status OR 
  (auth.role() = 'authenticated' AND (
    get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.album_invitations 
      WHERE album_id = id AND email = (auth.jwt() ->> 'email') AND enabled = true
    )
  ))
);

-- 3. Fix Album Invitations policies
DROP POLICY IF EXISTS "Owners can manage invitations" ON public.album_invitations;
DROP POLICY IF EXISTS "Users can see their own invitations" ON public.album_invitations;

CREATE POLICY "Superadmin and owners can manage invitations"
ON public.album_invitations
FOR ALL
TO authenticated
USING (
  get_auth_role() = 'superadmin'::app_role OR 
  get_album_owner(album_id) = auth.uid()
)
WITH CHECK (
  get_auth_role() = 'superadmin'::app_role OR 
  get_album_owner(album_id) = auth.uid()
);

CREATE POLICY "Users can see own invitations"
ON public.album_invitations
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- 4. Consolidate and fix Comics policies
DROP POLICY IF EXISTS "Admins and editors can manage comics" ON public.comics;
DROP POLICY IF EXISTS "Create comics restricted" ON public.comics;

CREATE POLICY "Superadmin and Role 3 full access on comics"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

CREATE POLICY "Role 1 and 2 update comics in own albums"
ON public.comics
FOR UPDATE
TO authenticated
USING (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
)
WITH CHECK (
  get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND 
  get_album_owner(album_id) = auth.uid()
);

CREATE POLICY "General select access for comics"
ON public.comics
FOR SELECT
TO public
USING (
  get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
  get_album_owner(album_id) = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE id = album_id AND (
      privacy = 'public'::privacy_status OR 
      EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_id = id AND email = (auth.jwt() ->> 'email') AND enabled = true
      )
    )
  )
);