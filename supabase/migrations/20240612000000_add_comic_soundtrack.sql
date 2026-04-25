-- Migration: Add Soundtrack Support to Comics
-- Description: Adds a soundtrack_url column to comics and creates a storage bucket for audio files.

-- 1. ADD soundtrack_url COLUMN TO comics TABLE
ALTER TABLE public.comics 
ADD COLUMN IF NOT EXISTS soundtrack_url TEXT;

-- 2. CREATE COMIC_SOUNDTRACKS BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comic_soundtracks', 'comic_soundtracks', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a', 'audio/m4a'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. CREATE STORAGE POLICIES FOR COMIC_SOUNDTRACKS BUCKET

-- SELECT: Allow public access to the comic_soundtracks bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access to Comic Soundtracks') THEN
        CREATE POLICY "Public Access to Comic Soundtracks"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'comic_soundtracks');
    END IF;
END $$;

-- INSERT: Allow authenticated users to upload to the comic_soundtracks bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload soundtracks') THEN
        CREATE POLICY "Authenticated users can upload soundtracks"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'comic_soundtracks');
    END IF;
END $$;

-- UPDATE: Allow authenticated users to update soundtracks in the bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update soundtracks') THEN
        CREATE POLICY "Authenticated users can update soundtracks"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'comic_soundtracks')
        WITH CHECK (bucket_id = 'comic_soundtracks');
    END IF;
END $$;

-- DELETE: Allow authenticated users to delete soundtracks from the bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete soundtracks') THEN
        CREATE POLICY "Authenticated users can delete soundtracks"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'comic_soundtracks');
    END IF;
END $$;