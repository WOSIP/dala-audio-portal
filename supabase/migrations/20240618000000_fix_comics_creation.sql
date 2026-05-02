-- Migration: Fix Comics Creation
-- Description: Replaces restrictive RLS policies with more permissive ones for authenticated users to ensure comic creation works.

-- 1. DROP EXISTING POLICIES ON COMICS
DROP POLICY IF EXISTS "comics_insert_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_update_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_delete_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_select_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_insert" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_select" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_update" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_delete" ON public.comics;

-- 2. CREATE NEW PERMISSIVE POLICIES FOR COMICS

-- INSERT: Allow all authenticated users to create comics
-- This is the most direct fix for comic creation issues.
CREATE POLICY "comics_authenticated_insert"
ON public.comics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Allow all users to see comics
-- This ensures that .insert().select() works correctly and users can see the catalog.
CREATE POLICY "comics_authenticated_select"
ON public.comics
FOR SELECT
TO public
USING (true);

-- UPDATE: Allow owners or admins/editors to update
-- We check if the user owns the album the comic belongs to, or has an elevated role.
CREATE POLICY "comics_authenticated_update"
ON public.comics
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.albums 
        WHERE albums.id = comics.album_id AND (
            albums.owner_id = auth.uid() OR 
            get_auth_role() IN ('admin', 'editor', 'superadmin')
        )
    ) OR (album_id IS NULL)
)
WITH CHECK (true);

-- DELETE: Allow owners or admins/superadmins to delete
CREATE POLICY "comics_authenticated_delete"
ON public.comics
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.albums 
        WHERE albums.id = comics.album_id AND (
            albums.owner_id = auth.uid() OR 
            get_auth_role() IN ('admin', 'superadmin')
        )
    ) OR (album_id IS NULL)
);

-- 3. ENSURE STORAGE POLICIES ARE CORRECT
-- Make sure authenticated users can manage their comic assets.

DROP POLICY IF EXISTS "Authorized users can upload comics" ON storage.objects;
CREATE POLICY "Authorized users can upload comics"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comics');

DROP POLICY IF EXISTS "Authorized users can update comics" ON storage.objects;
CREATE POLICY "Authorized users can update comics"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comics')
WITH CHECK (bucket_id = 'comics');

DROP POLICY IF EXISTS "Authorized users can delete comics" ON storage.objects;
CREATE POLICY "Authorized users can delete comics"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comics');

-- 4. GRANT PERMISSIONS
GRANT ALL ON public.comics TO authenticated;
GRANT SELECT ON public.comics TO anon;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';