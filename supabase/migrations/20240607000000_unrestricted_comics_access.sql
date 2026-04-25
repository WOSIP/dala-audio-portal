-- Migration: Unrestricted Comics Access for Authenticated Users
-- Description: Drops all existing restricted policies for the comics table and allows any authenticated user full access (CRUD).

-- 1. DROP EXISTING POLICIES
DROP POLICY IF EXISTS "High-level roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Creator roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Select comics access" ON public.comics;

-- 2. CREATE UNRESTRICTED POLICY FOR AUTHENTICATED USERS
-- This allows any logged-in user to create, read, update, and delete comics.
CREATE POLICY "Allow all actions for authenticated users"
ON public.comics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. ENSURE RLS IS ENABLED
-- We keep RLS enabled to ensure that anonymous users do not have access, 
-- meeting the requirement of "any authenticated user".
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';