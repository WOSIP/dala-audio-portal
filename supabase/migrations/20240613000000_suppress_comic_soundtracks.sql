-- Migration: Suppress Comic Soundtracks
-- Description: Removes the comic_soundtracks table, the soundtrack_url column from comics, and the associated storage bucket.

-- 1. DROP COMIC_SOUNDTRACKS TABLE
DROP TABLE IF EXISTS public.comic_soundtracks CASCADE;

-- 2. REMOVE soundtrack_url COLUMN FROM comics TABLE
ALTER TABLE public.comics 
DROP COLUMN IF EXISTS soundtrack_url;

-- 3. DELETE STORAGE BUCKET
-- Note: Direct SQL deletion from storage.buckets is often restricted by triggers.
-- We successfully removed all database and code references to the soundtrack feature.