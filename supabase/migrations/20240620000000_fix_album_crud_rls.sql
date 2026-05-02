-- Migration: Fix Album CRUD RLS
-- Description: Updates RLS policies for albums to allow authenticated users to create and modify albums without restrictive ownership checks, matching the recent permissive pattern.

-- 1. Ensure RLS is enabled
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "albums_insert_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_update_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_select_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_delete_policy" ON public.albums;
DROP POLICY IF EXISTS "Allow public to insert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public to update albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public to delete albums" ON public.albums;
DROP POLICY IF EXISTS "Allow select for public and owners" ON public.albums;

-- 3. Create NEW permissive policies for authenticated users

-- SELECT: Allow everyone to view albums (public)
CREATE POLICY "albums_authenticated_select_policy"
ON public.albums
FOR SELECT
TO public
USING (true);

-- INSERT: Allow any authenticated user to create an album
CREATE POLICY "albums_authenticated_insert_policy"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Allow any authenticated user to modify any album
-- This fulfills the request "allow authenticated users to create or modify an album"
CREATE POLICY "albums_authenticated_update_policy"
ON public.albums
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Maintain some restriction on deletion, but allow admins and owners
CREATE POLICY "albums_authenticated_delete_policy"
ON public.albums
FOR DELETE
TO authenticated
USING (
    (owner_id = auth.uid()) OR 
    (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role))
);

-- 4. Grant necessary permissions
GRANT ALL ON public.albums TO authenticated;
GRANT SELECT ON public.albums TO anon;

-- 5. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';