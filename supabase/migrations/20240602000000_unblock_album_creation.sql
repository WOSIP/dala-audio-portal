-- Migration: Unblock album creation for all authenticated users
-- Description: Ensures that no RLS policy blocks the creation of new albums by authenticated users.

-- 1. Drop existing policies on public.albums that might be restrictive
DROP POLICY IF EXISTS "Authenticated users can manage their own albums" ON public.albums;
DROP POLICY IF EXISTS "High-level roles management access" ON public.albums;

-- 2. Re-create a policy that explicitly allows INSERT for any authenticated user
-- We use a dedicated INSERT policy to ensure creation is never blocked.
CREATE POLICY "Allow authenticated users to create albums"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Re-create the management policy for the owner (SELECT, UPDATE, DELETE)
-- This ensures users can still manage the albums they created.
CREATE POLICY "Users can manage their own albums"
ON public.albums
FOR ALL 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 4. Re-create the high-level roles management policy
-- This ensures admins can still manage everything.
CREATE POLICY "High-level roles management access"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'))
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'));

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';