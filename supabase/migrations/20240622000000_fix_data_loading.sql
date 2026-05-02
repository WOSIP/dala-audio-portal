-- Migration: Final Database Connectivity Fix
-- Description: Ensures all tables required for the initial data fetch (albums, comics, profiles, and invitations) 
-- have permissive SELECT policies for public/anonymous users and verifies foreign key relationships.

-- 1. Ensure album_invitations has a SELECT policy for public users
-- This is critical because App.tsx performs a join on this table during initial fetch.
ALTER TABLE public.album_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_select_invitations" ON public.album_invitations;
CREATE POLICY "public_select_invitations"
ON public.album_invitations
FOR SELECT
TO public
USING (true);

-- 2. Ensure profiles table has a SELECT policy for public users
-- This is needed for fetching album authors.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- 3. Ensure comics table has a SELECT policy for public users (redundancy check)
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comics_public_read" ON public.comics;
CREATE POLICY "comics_public_read"
ON public.comics
FOR SELECT
TO public
USING (true);

-- 4. Verify and re-establish the relationship between albums and invitations if missing
-- This ensures the join in `supabase.from('albums').select('*, album_invitations(*)')` works.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'album_invitations_album_id_fkey'
    ) THEN
        ALTER TABLE public.album_invitations 
        ADD CONSTRAINT album_invitations_album_id_fkey 
        FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Grant necessary permissions to roles
GRANT SELECT ON public.albums TO anon, authenticated;
GRANT SELECT ON public.comics TO anon, authenticated;
GRANT SELECT ON public.album_invitations TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 6. Force schema cache reload
NOTIFY pgrst, 'reload schema';