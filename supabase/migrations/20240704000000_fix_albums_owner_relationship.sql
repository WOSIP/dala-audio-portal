-- Fix/Trigger for foreign key relationship detection on albums.owner_id

-- The foreign key constraint already exists, but the Supabase API metadata
-- might be stale. This comment-only change is intended to trigger a
-- schema cache refresh without altering the table structure.

COMMENT ON COLUMN public.albums.owner_id IS 'Owner of the album, references auth.users.id';

-- Additionally, let's re-affirm the RLS SELECT policy on the albums table
-- to ensure it's not interfering with relationship detection.
-- This policy allows public read access, which is consistent with existing behavior.

DROP POLICY IF EXISTS albums_public_select_policy ON public.albums;
CREATE POLICY albums_public_select_policy ON public.albums
FOR SELECT
USING (true);

-- Re-enabling RLS, just in case it was disabled during previous migrations.
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;