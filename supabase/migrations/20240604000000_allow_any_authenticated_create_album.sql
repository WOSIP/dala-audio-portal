-- Migration to explicitly allow any authenticated user to create albums
-- This ensures that the INSERT permission is universally available to all logged-in users

-- First, remove any potentially conflicting or redundant policies to keep things clean
DROP POLICY IF EXISTS "Allow all authenticated to insert albums" ON public.albums;
DROP POLICY IF EXISTS "Allow authenticated users to create albums" ON public.albums;
DROP POLICY IF EXISTS "Allow any authenticated user to create albums" ON public.albums;

-- Create the new universal policy for INSERT
CREATE POLICY "Allow any authenticated user to create albums"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;