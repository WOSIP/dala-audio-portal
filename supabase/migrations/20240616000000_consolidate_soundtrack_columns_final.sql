-- Migration: Consolidate Soundtrack Columns
-- Description: Ensures there is only one definitive soundtrack column per entity. 
-- For albums, this is 'soundtrack_url'. For comics (episodes), the primary audio is 'audio_url'.
-- This removes the redundant 'soundtrack_url' from the comics table if it exists.

-- 1. Ensure soundtrack_url exists in albums table
ALTER TABLE public.albums 
ADD COLUMN IF NOT EXISTS soundtrack_url TEXT;

-- 2. Remove redundant soundtrack_url from comics table
-- This column was added in a previous migration but is now consolidated at the album level.
ALTER TABLE public.comics 
DROP COLUMN IF EXISTS soundtrack_url;

-- 3. Ensure comics table has its primary audio column
ALTER TABLE public.comics 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';