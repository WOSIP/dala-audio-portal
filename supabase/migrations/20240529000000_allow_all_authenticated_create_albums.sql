-- Migration: Allow any authenticated user to create and manage their own albums
-- Description: Broadens album creation access from specific roles to all authenticated users.

-- 1. Drop the old restricted policy
DROP POLICY IF EXISTS "Creator roles management" ON public.albums;

-- 2. Create a new policy that allows ANY authenticated user to manage their own albums
-- This enables INSERT (creation) as well as UPDATE/DELETE for the owner.
-- The owner_id defaults to auth.uid() in the table schema.
CREATE POLICY "Authenticated users can manage their own albums"
ON public.albums
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- 3. Notify postgrest to reload the schema cache
NOTIFY pgrst, 'reload schema';