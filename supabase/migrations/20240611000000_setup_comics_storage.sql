-- Migration: Create Comics Storage Bucket and Policies
-- Description: Sets up a dedicated storage bucket for comic assets (covers, illustrations) and configures RLS.

-- 1. CREATE COMICS BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comics', 'comics', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. ENABLE RLS ON STORAGE.OBJECTS (usually already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. CREATE STORAGE POLICIES FOR COMICS BUCKET

-- SELECT: Allow public access to the comics bucket (since it's a public bucket)
CREATE POLICY "Public Access to Comics"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comics');

-- INSERT: Allow authenticated users to upload to the comics bucket
CREATE POLICY "Authenticated users can upload comics"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comics');

-- UPDATE: Allow authenticated users to update their uploads in the comics bucket
CREATE POLICY "Authenticated users can update comics"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comics')
WITH CHECK (bucket_id = 'comics');

-- DELETE: Allow authenticated users to delete from the comics bucket
CREATE POLICY "Authenticated users can delete comics"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comics');

-- 4. ENSURE COMICS TABLE RLS ALLOWS UPDATE ON COVER_URL
-- The existing policy "comics_authenticated_update" already allows all updates for authenticated users.
-- We'll just ensure it exists and is correct.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'comics' 
        AND policyname = 'comics_authenticated_update'
    ) THEN
        CREATE POLICY "comics_authenticated_update"
        ON public.comics
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;