-- Migration: Fix Data Loading Permissions
-- Description: Ensures that the public (anon) and authenticated roles have the necessary permissions to fetch data.
-- This addresses the "Failed to load data from database" error which is often caused by missing RLS policies or GRANTS on joined tables.

-- 1. Ensure the public schema is accessible
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant SELECT on all relevant tables to both roles
-- This ensures that the database-level permissions allow reading the data.
GRANT SELECT ON public.albums TO anon, authenticated;
GRANT SELECT ON public.comics TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.album_invitations TO anon, authenticated;
GRANT SELECT ON public.user_roles TO anon, authenticated;

-- 3. Fix RLS for album_invitations
-- The current fetch in App.tsx joins album_invitations on the main catalog fetch.
-- If an anonymous user cannot read this table, the join will cause a permission error.
-- We add a policy to allow public SELECT access to invitations.
-- Note: While this allows seeing who is invited, it is necessary for the current client-side email verification logic.
DROP POLICY IF EXISTS "Public select for invitations" ON public.album_invitations;
CREATE POLICY "Public select for invitations"
ON public.album_invitations
FOR SELECT
TO public
USING (true);

-- 4. Ensure comics are readable by everyone (already exists but re-affirming)
DROP POLICY IF EXISTS "comics_read_all_policy" ON public.comics;
CREATE POLICY "comics_read_all_policy"
ON public.comics
FOR SELECT
TO public
USING (true);

-- 5. Ensure profiles are readable by everyone (already exists but re-affirming)
DROP POLICY IF EXISTS "profiles_read_all_policy" ON public.profiles;
CREATE POLICY "profiles_read_all_policy"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- 6. Reload schema cache to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';