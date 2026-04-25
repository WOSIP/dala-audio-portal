-- Migration: Fix RLS policies for albums, comics (episodes), and invitations
-- Description: Ensures superadmin, admin, and editor roles have full management access.
-- Resolves "new row violates row-level security policy" errors for these roles.

-- 1. Albums Table Policies
DROP POLICY IF EXISTS "Admin and Role 3 management access" ON public.albums;
DROP POLICY IF EXISTS "Creator roles insert access" ON public.albums;
DROP POLICY IF EXISTS "Creator roles owner management" ON public.albums;
DROP POLICY IF EXISTS "Superadmin full access" ON public.albums;
DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;
DROP POLICY IF EXISTS "High-level roles management access" ON public.albums;
DROP POLICY IF EXISTS "Creator roles management" ON public.albums;

-- Management access for high roles (Superadmin, Admin, Editor, Role3)
CREATE POLICY "High-level roles management access"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role));

-- Creator access for other roles (Role1, Role2)
CREATE POLICY "Creator roles management"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (owner_id = auth.uid()))
WITH CHECK (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (owner_id = auth.uid() OR owner_id IS NULL));


-- 2. Comics (Episodes) Table Policies
DROP POLICY IF EXISTS "Enable comic management for high roles" ON public.comics;
DROP POLICY IF EXISTS "Enable comic management for owners" ON public.comics;
DROP POLICY IF EXISTS "Admins and editors can manage comics" ON public.comics;
DROP POLICY IF EXISTS "High-level roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Creator roles comic management" ON public.comics;

-- Management access for high roles
CREATE POLICY "High-level roles comic management"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role));

-- Creator access (if they own the album)
CREATE POLICY "Creator roles comic management"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (get_album_owner(album_id) = auth.uid()))
WITH CHECK (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (get_album_owner(album_id) = auth.uid()));


-- 3. Album Invitations Table Policies
DROP POLICY IF EXISTS "Manage invitations" ON public.album_invitations;
DROP POLICY IF EXISTS "High-level roles invitation management" ON public.album_invitations;

CREATE POLICY "High-level roles invitation management"
ON public.album_invitations
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role) OR get_album_owner(album_id) = auth.uid())
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role) OR get_album_owner(album_id) = auth.uid());


-- 4. Ensure SELECT access is inclusive
DROP POLICY IF EXISTS "Universal select access for albums" ON public.albums;
CREATE POLICY "Universal select access for albums"
ON public.albums
FOR SELECT
TO public
USING (
  privacy = 'public'::privacy_status OR 
  (auth.role() = 'authenticated' AND (
    get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role) OR 
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.album_invitations 
      WHERE album_id = albums.id 
      AND email = auth.jwt()->>'email' 
      AND enabled = true
    )
  ))
);

DROP POLICY IF EXISTS "Select comics access" ON public.comics;
CREATE POLICY "Select comics access"
ON public.comics
FOR SELECT
TO public
USING (
  get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role) OR 
  get_album_owner(album_id) = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND (
      albums.privacy = 'public'::privacy_status OR 
      EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_id = albums.id 
        AND email = auth.jwt()->>'email' 
        AND enabled = true
      )
    )
  )
);

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';