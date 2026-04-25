-- Migration: Fix Comics Creation RLS
-- Description: Replaces the catch-all policy for the comics table with explicit, granular policies.
-- This follows the successful pattern used for the albums table to resolve "new rows violated policy rules" errors.

-- 1. DROP ALL EXISTING POLICIES ON COMICS TABLE
-- This ensures a clean slate and avoids any conflicts between catch-all and granular policies.
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.comics;
DROP POLICY IF EXISTS "High-level roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Creator roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Select comics access" ON public.comics;

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- 3. CREATE EXPLICIT POLICIES FOR EACH OPERATION

-- INSERT: Allow all authenticated users to create comics
-- We use WITH CHECK (true) to ensure that any logged-in user can insert new rows.
-- This is the primary fix for the "new rows violated policy rules" violation.
CREATE POLICY "comics_authenticated_insert"
ON public.comics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Allow authenticated users to see all comics, and anon users to see comics of public albums
-- For simplicity and following the "unrestricted access for authenticated users" requirement,
-- we allow all authenticated users to SELECT.
CREATE POLICY "comics_authenticated_select"
ON public.comics
FOR SELECT
TO authenticated
USING (true);

-- For anonymous users, we check the parent album's privacy
CREATE POLICY "comics_anon_select"
ON public.comics
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND albums.privacy = 'public'::privacy_status
  )
);

-- UPDATE: Allow all authenticated users to update comics
-- Following the pattern of unrestricted access for comics as requested.
CREATE POLICY "comics_authenticated_update"
ON public.comics
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Allow all authenticated users to delete comics
CREATE POLICY "comics_authenticated_delete"
ON public.comics
FOR DELETE
TO authenticated
USING (true);

-- 4. GRANT EXPLICIT PERMISSIONS
-- Sometimes RLS policies need explicit grants to the role to function correctly in certain environments.
GRANT ALL ON public.comics TO authenticated;
GRANT SELECT ON public.comics TO anon;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';