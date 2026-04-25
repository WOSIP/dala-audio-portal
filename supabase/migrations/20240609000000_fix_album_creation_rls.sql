-- Migration to fix the "new rows violated policy rules of album" error
-- This migration replaces the existing policies on the albums table with a more robust and explicit set of policies.

-- 1. Drop all existing policies on the albums table to ensure a clean state
DROP POLICY IF EXISTS "Admins can manage all albums" ON public.albums;
DROP POLICY IF EXISTS "Allow any authenticated user to create albums" ON public.albums;
DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;
DROP POLICY IF EXISTS "Universal select access for albums" ON public.albums;
DROP POLICY IF EXISTS "authenticated_insert_albums" ON public.albums;
DROP POLICY IF EXISTS "anyone_select_albums" ON public.albums;
DROP POLICY IF EXISTS "owners_admins_update_albums" ON public.albums;
DROP POLICY IF EXISTS "owners_admins_delete_albums" ON public.albums;

-- 2. Ensure RLS is enabled
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- 3. Create explicit policies for each operation

-- INSERT: Allow all authenticated users to create albums
-- We use WITH CHECK (true) to ensure that ANY authenticated user can insert.
-- This is the primary fix for the "new rows violated policy rules" error.
CREATE POLICY "allow_authenticated_insert"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Public access for public albums, authenticated access for owners/admins/invited
-- We use USING to filter rows that can be seen.
CREATE POLICY "allow_select_albums"
ON public.albums
FOR SELECT
TO public
USING (
  (privacy = 'public'::privacy_status) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (
      (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role])) OR 
      (owner_id = auth.uid()) OR 
      (EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_invitations.album_id = public.albums.id 
        AND album_invitations.email = (auth.jwt() ->> 'email')
        AND album_invitations.enabled = true
      ))
    )
  )
);

-- UPDATE: Allow owners and admins to update
CREATE POLICY "allow_owner_admin_update"
ON public.albums
FOR UPDATE
TO authenticated
USING (
  (owner_id = auth.uid()) OR 
  (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role]))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role]))
);

-- DELETE: Allow owners and admins to delete
CREATE POLICY "allow_owner_admin_delete"
ON public.albums
FOR DELETE
TO authenticated
USING (
  (owner_id = auth.uid()) OR 
  (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role]))
);

-- 4. Grant explicit permissions to roles just in case
GRANT ALL ON public.albums TO authenticated;
GRANT SELECT ON public.albums TO anon;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';