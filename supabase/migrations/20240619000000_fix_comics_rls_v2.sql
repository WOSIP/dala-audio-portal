-- Migration: Fix Comics Creation RLS
-- Description: Re-establishes permissive RLS policies for comic creation by authenticated users.
-- This ensures that any authenticated user can create new comic entries.

-- 1. Ensure RLS is enabled on the comics table
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on the comics table to ensure a clean state
DROP POLICY IF EXISTS "comics_authenticated_insert" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_select" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_update" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_delete" ON public.comics;
DROP POLICY IF EXISTS "comics_insert_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_select_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_update_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_delete_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_insert_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_select_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_update_policy" ON public.comics;
DROP POLICY IF EXISTS "comics_authenticated_delete_policy" ON public.comics;

-- 3. Create NEW policies for the comics table

-- INSERT: Allow any authenticated user to create a comic
-- This is the primary fix requested.
CREATE POLICY "comics_authenticated_insert_policy"
ON public.comics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Allow all users (including anonymous) to view comics
-- This is necessary for the UI to display the catalog and for the result of INSERT to be visible.
CREATE POLICY "comics_authenticated_select_policy"
ON public.comics
FOR SELECT
TO public
USING (true);

-- UPDATE: Allow owners of the parent album or users with elevated roles to update comics
CREATE POLICY "comics_authenticated_update_policy"
ON public.comics
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.albums 
        WHERE albums.id = comics.album_id AND (
            albums.owner_id = auth.uid() OR 
            get_auth_role() IN ('admin'::app_role, 'editor'::app_role, 'superadmin'::app_role)
        )
    ) OR (album_id IS NULL)
)
WITH CHECK (true);

-- DELETE: Allow owners of the parent album or admins to delete comics
CREATE POLICY "comics_authenticated_delete_policy"
ON public.comics
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.albums 
        WHERE albums.id = comics.album_id AND (
            albums.owner_id = auth.uid() OR 
            get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role)
        )
    ) OR (album_id IS NULL)
);

-- 4. Ensure necessary permissions are granted
GRANT ALL ON public.comics TO authenticated;
GRANT SELECT ON public.comics TO anon;

-- 5. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';