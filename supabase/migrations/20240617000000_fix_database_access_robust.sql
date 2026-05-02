-- Migration: Fix Database Access Issues
-- Description: Robustly handles role management, fixes superadmin bypass, and secures table access.

-- 1. ENHANCE get_auth_role function for reliability and performance
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role public.app_role;
  v_email text;
  v_enabled boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- If not logged in, return viewer
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Check if user is enabled in profiles
  SELECT is_enabled INTO v_enabled FROM public.profiles WHERE id = v_user_id;
  
  -- If user is explicitly disabled, return viewer (restricted)
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Get role from user_roles table
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user_id;
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  -- Fallback for superadmin email
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;
  
  -- Default role
  RETURN 'viewer'::public.app_role;
END;
$$;

-- 2. FIX ALBUMS POLICIES
-- Drop the overly permissive "public" policies
DROP POLICY IF EXISTS "Allow public to insert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public to update albums" ON public.albums;
DROP POLICY IF EXISTS "Allow public to delete albums" ON public.albums;
DROP POLICY IF EXISTS "Allow select for public and owners" ON public.albums;

-- New Albums Policies
CREATE POLICY "albums_select_policy" ON public.albums
    FOR SELECT TO public
    USING (
        (privacy = 'public'::privacy_status) OR 
        (owner_id = auth.uid()) OR 
        (get_auth_role() IN ('admin', 'editor', 'superadmin'))
    );

CREATE POLICY "albums_insert_policy" ON public.albums
    FOR INSERT TO authenticated
    WITH CHECK (
        (owner_id = auth.uid()) OR 
        (get_auth_role() IN ('admin', 'editor', 'superadmin'))
    );

CREATE POLICY "albums_update_policy" ON public.albums
    FOR UPDATE TO authenticated
    USING (
        (owner_id = auth.uid()) OR 
        (get_auth_role() IN ('admin', 'editor', 'superadmin'))
    )
    WITH CHECK (
        (owner_id = auth.uid()) OR 
        (get_auth_role() IN ('admin', 'editor', 'superadmin'))
    );

CREATE POLICY "albums_delete_policy" ON public.albums
    FOR DELETE TO authenticated
    USING (
        (owner_id = auth.uid()) OR 
        (get_auth_role() IN ('admin', 'superadmin'))
    );

-- 3. FIX COMICS POLICIES
DROP POLICY IF EXISTS "comics_insert_policy_public" ON public.comics;
DROP POLICY IF EXISTS "comics_update_policy_public" ON public.comics;
DROP POLICY IF EXISTS "comics_delete_policy_public" ON public.comics;
DROP POLICY IF EXISTS "comics_select_policy" ON public.comics;

-- New Comics Policies
CREATE POLICY "comics_select_policy" ON public.comics
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE albums.id = comics.album_id
        )
    );

CREATE POLICY "comics_insert_policy" ON public.comics
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE albums.id = comics.album_id AND (
                albums.owner_id = auth.uid() OR 
                get_auth_role() IN ('admin', 'editor', 'superadmin')
            )
        )
    );

CREATE POLICY "comics_update_policy" ON public.comics
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE albums.id = comics.album_id AND (
                albums.owner_id = auth.uid() OR 
                get_auth_role() IN ('admin', 'editor', 'superadmin')
            )
        )
    );

CREATE POLICY "comics_delete_policy" ON public.comics
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE albums.id = comics.album_id AND (
                albums.owner_id = auth.uid() OR 
                get_auth_role() IN ('admin', 'superadmin')
            )
        )
    );

-- 4. FIX STORAGE POLICIES
-- Ensure select is possible for listing
CREATE POLICY "Public select on comics" ON storage.objects FOR SELECT TO public USING (bucket_id = 'comics');
CREATE POLICY "Public select on soundtracks" ON storage.objects FOR SELECT TO public USING (bucket_id = 'comic_soundtracks');

-- Refine upload/manage to authenticated and authorized
DROP POLICY IF EXISTS "Public users can upload to comics" ON storage.objects;
DROP POLICY IF EXISTS "Public users can update comics" ON storage.objects;
DROP POLICY IF EXISTS "Public users can delete comics" ON storage.objects;
DROP POLICY IF EXISTS "Public users can upload soundtracks" ON storage.objects;
DROP POLICY IF EXISTS "Public users can update soundtracks" ON storage.objects;
DROP POLICY IF EXISTS "Public users can delete soundtracks" ON storage.objects;

CREATE POLICY "Authorized users can upload comics" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comics');
CREATE POLICY "Authorized users can update comics" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'comics');
CREATE POLICY "Authorized users can delete comics" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'comics');

CREATE POLICY "Authorized users can upload soundtracks" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comic_soundtracks');
CREATE POLICY "Authorized users can update soundtracks" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'comic_soundtracks');
CREATE POLICY "Authorized users can delete soundtracks" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'comic_soundtracks');

-- 5. ENSURE SUPERADMIN IS SET
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::public.app_role 
FROM auth.users 
WHERE email = 'kristalwos@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';