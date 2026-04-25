-- Migration: Remove all album creation blockers
-- Description: Drops all existing INSERT-related policies on albums and ensures any authenticated user can create them.

-- 1. Drop ALL existing policies on public.albums to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to create albums" ON public.albums;
DROP POLICY IF EXISTS "High-level roles management access" ON public.albums;
DROP POLICY IF EXISTS "Universal select access for albums" ON public.albums;
DROP POLICY IF EXISTS "Users can manage their own albums" ON public.albums;
DROP POLICY IF EXISTS "Authenticated users can manage their own albums" ON public.albums;
DROP POLICY IF EXISTS "Creator roles management" ON public.albums;

-- 2. Create a clean INSERT policy for ANY authenticated user
-- This explicitly allows creation without checking roles or ownership (which is impossible for new rows)
CREATE POLICY "Allow all authenticated to insert albums"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Restore SELECT access (Universal select)
-- Restoring the logic from previous migrations to ensure data visibility remains correct.
CREATE POLICY "Universal select access for albums"
ON public.albums
FOR SELECT
TO public
USING (
  (privacy = 'public'::privacy_status) OR 
  (
    (auth.role() = 'authenticated') AND 
    (
      (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role)) OR 
      (owner_id = auth.uid()) OR 
      (EXISTS (
        SELECT 1 FROM album_invitations 
        WHERE album_id = albums.id 
        AND email = (auth.jwt() ->> 'email') 
        AND enabled = true
      ))
    )
  )
);

-- 4. Restore Management access for owners (UPDATE, DELETE)
-- Separate management from creation to avoid circular dependency or role check failures during INSERT.
CREATE POLICY "Owners can manage their albums"
ON public.albums
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 5. Restore High-level roles management access
-- Separate admin access to ensure they can manage everything regardless of ownership.
CREATE POLICY "Admins can manage all albums"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role));

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';