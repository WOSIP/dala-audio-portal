-- Migration: Consolidate Soundtrack Columns
-- Description: Moves the soundtrack_url from comics to albums to ensure a single, definitive soundtrack per album, 
-- and maintains audio_url for individual episodes (comics). This simplifies data management.

-- 1. ADD soundtrack_url TO albums TABLE
ALTER TABLE public.albums 
ADD COLUMN IF NOT EXISTS soundtrack_url TEXT;

-- 2. DROP redundant soundtrack_url FROM comics TABLE
-- We checked and the existing values are NULL, so no data loss.
ALTER TABLE public.comics 
DROP COLUMN IF EXISTS soundtrack_url;

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';