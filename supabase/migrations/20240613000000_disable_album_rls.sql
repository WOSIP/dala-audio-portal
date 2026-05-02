-- Suppress Row Level Security for albums table
ALTER TABLE public.albums DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "albums_select_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_insert_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_update_policy" ON public.albums;
DROP POLICY IF EXISTS "albums_delete_policy" ON public.albums;