-- Rebuild Policies for Albums and Comics
-- This migration re-enables RLS and establishes clean, non-recursive policies
-- for creating and modifying albums and comics.

-- 1. Restore the role function to be functional but safe
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- We query user_roles directly. Since this is SECURITY DEFINER, 
  -- it bypasses RLS on user_roles, avoiding recursion.
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'viewer'::public.app_role);
END;
$$;

-- 2. Re-enable RLS on core tables
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES (to start fresh)
DROP POLICY IF EXISTS "High-level roles management access" ON public.albums;
DROP POLICY IF EXISTS "Authenticated users can manage their own albums" ON public.albums;
DROP POLICY IF EXISTS "Universal select access for albums" ON public.albums;
DROP POLICY IF EXISTS "Admins can manage all albums" ON public.albums;
DROP POLICY IF EXISTS "Allow any authenticated user to create albums" ON public.albums;
DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;

DROP POLICY IF EXISTS "High-level roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Creator roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Select comics access" ON public.comics;

-- 4. NEW ALBUM POLICIES

-- SELECT: Public if public, or owner, or any high-level role
CREATE POLICY "Albums view access" 
ON public.albums FOR SELECT 
TO public
USING (
  privacy = 'public' OR 
  owner_id = auth.uid() OR 
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3')
);

-- INSERT: Any authenticated user can create an album
CREATE POLICY "Albums insert access" 
ON public.albums FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE/DELETE: Owner or high-level roles
CREATE POLICY "Albums update access" 
ON public.albums FOR UPDATE 
TO authenticated 
USING (
  owner_id = auth.uid() OR 
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3')
)
WITH CHECK (
  owner_id = auth.uid() OR 
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3')
);

CREATE POLICY "Albums delete access" 
ON public.albums FOR DELETE 
TO authenticated 
USING (
  owner_id = auth.uid() OR 
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3')
);

-- 5. NEW COMICS POLICIES

-- SELECT: Same logic as albums
CREATE POLICY "Comics view access" 
ON public.comics FOR SELECT 
TO public
USING (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND (albums.privacy = 'public' OR albums.owner_id = auth.uid())
  )
);

-- INSERT: Album owner or high-level roles
CREATE POLICY "Comics insert access" 
ON public.comics FOR INSERT 
TO authenticated 
WITH CHECK (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND albums.owner_id = auth.uid()
  )
);

-- UPDATE/DELETE: Album owner or high-level roles
CREATE POLICY "Comics update access" 
ON public.comics FOR UPDATE 
TO authenticated 
USING (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND albums.owner_id = auth.uid()
  )
)
WITH CHECK (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND albums.owner_id = auth.uid()
  )
);

CREATE POLICY "Comics delete access" 
ON public.comics FOR DELETE 
TO authenticated 
USING (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND albums.owner_id = auth.uid()
  )
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';