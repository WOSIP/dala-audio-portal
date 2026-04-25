-- Migration: Recreate Comics (Episodes) Table
-- Description: Drops and recreates the comics table (referred to as episodes in UI) to ensure a clean state.
-- Re-applies all necessary RLS policies and indexes.

-- 1. DROP EXISTING TABLE
-- CASCADE handles dependent views or other objects if any.
DROP TABLE IF EXISTS public.comics CASCADE;

-- 2. CREATE TABLE
CREATE TABLE public.comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT,
  cover_url TEXT,
  illustration_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  audio_import_link TEXT,
  illustration_import_link TEXT,
  enabled BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Management access for high roles (Superadmin, Admin, Editor, Role3)
CREATE POLICY "High-level roles comic management"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role))
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role));

-- Creator access (if they own the album)
CREATE POLICY "Creator roles comic management"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (get_album_owner(album_id) = auth.uid()))
WITH CHECK (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND (get_album_owner(album_id) = auth.uid()));

-- Universal Select access based on album privacy and invitations
CREATE POLICY "Select comics access"
ON public.comics
FOR SELECT
TO public
USING (
  get_auth_role() IN ('superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role) OR 
  get_album_owner(album_id) = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND (
      albums.privacy = 'public'::privacy_status OR 
      EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_id = albums.id 
        AND email = auth.jwt()->>'email' 
        AND enabled = true
      )
    )
  )
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);

-- 6. TRIGGER FOR UPDATED_AT
-- Re-using standard logic if existing or creating a simple one
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comics_updated
  BEFORE UPDATE ON public.comics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';