-- Fix missing soundtrack_url column in comics table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comics' AND column_name = 'soundtrack_url') THEN
        ALTER TABLE public.comics ADD COLUMN soundtrack_url text;
    END IF;
END $$;

-- Update RLS policies for albums to allow anon (for admin bypass)
DROP POLICY IF EXISTS "Allow authenticated users to insert albums" ON public.albums;
CREATE POLICY "Allow public to insert albums" ON public.albums 
    FOR INSERT TO public 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updates for owners and staff" ON public.albums;
CREATE POLICY "Allow public to update albums" ON public.albums 
    FOR UPDATE TO public 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for owners and staff" ON public.albums;
CREATE POLICY "Allow public to delete albums" ON public.albums 
    FOR DELETE TO public 
    USING (true);

-- Update RLS policies for comics to allow anon
DROP POLICY IF EXISTS "comics_insert_policy" ON public.comics;
CREATE POLICY "comics_insert_policy_public" ON public.comics 
    FOR INSERT TO public 
    WITH CHECK (true);

DROP POLICY IF EXISTS "comics_update_policy" ON public.comics;
CREATE POLICY "comics_update_policy_public" ON public.comics 
    FOR UPDATE TO public 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "comics_delete_policy" ON public.comics;
CREATE POLICY "comics_delete_policy_public" ON public.comics 
    FOR DELETE TO public 
    USING (true);

-- Update RLS policies for album_invitations to allow anon
DROP POLICY IF EXISTS "album_invitations_insert_policy" ON public.album_invitations;
CREATE POLICY "album_invitations_insert_policy_public" ON public.album_invitations 
    FOR INSERT TO public 
    WITH CHECK (true);

DROP POLICY IF EXISTS "album_invitations_update_policy" ON public.album_invitations;
CREATE POLICY "album_invitations_update_policy_public" ON public.album_invitations 
    FOR UPDATE TO public 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "album_invitations_delete_policy" ON public.album_invitations;
CREATE POLICY "album_invitations_delete_policy_public" ON public.album_invitations 
    FOR DELETE TO public 
    USING (true);

-- Update Storage Policies for comics bucket
DROP POLICY IF EXISTS "Authenticated users can upload to comics" ON storage.objects;
CREATE POLICY "Public users can upload to comics" ON storage.objects 
    FOR INSERT TO public 
    WITH CHECK (bucket_id = 'comics');

DROP POLICY IF EXISTS "Authenticated users can update comics" ON storage.objects;
CREATE POLICY "Public users can update comics" ON storage.objects 
    FOR UPDATE TO public 
    USING (bucket_id = 'comics') 
    WITH CHECK (bucket_id = 'comics');

DROP POLICY IF EXISTS "Authenticated users can delete comics" ON storage.objects;
CREATE POLICY "Public users can delete comics" ON storage.objects 
    FOR DELETE TO public 
    USING (bucket_id = 'comics');

-- Update Storage Policies for comic_soundtracks bucket
DROP POLICY IF EXISTS "Authenticated users can upload soundtracks" ON storage.objects;
CREATE POLICY "Public users can upload soundtracks" ON storage.objects 
    FOR INSERT TO public 
    WITH CHECK (bucket_id = 'comic_soundtracks');

DROP POLICY IF EXISTS "Authenticated users can update soundtracks" ON storage.objects;
CREATE POLICY "Public users can update soundtracks" ON storage.objects 
    FOR UPDATE TO public 
    USING (bucket_id = 'comic_soundtracks') 
    WITH CHECK (bucket_id = 'comic_soundtracks');

DROP POLICY IF EXISTS "Authenticated users can delete soundtracks" ON storage.objects;
CREATE POLICY "Public users can delete soundtracks" ON storage.objects 
    FOR DELETE TO public 
    USING (bucket_id = 'comic_soundtracks');