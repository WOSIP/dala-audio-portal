-- Migration: Adjust album creation policies
-- Target: Permit album creation for Superadmin, Admin, Role 3, and Role 2.
-- Restrict: Role 1 and Viewer are restricted from creation to maintain role hierarchy and security.

-- First, drop the existing conflicting policies for albums
DROP POLICY IF EXISTS "Create albums role 1 and 2" ON public.albums;
DROP POLICY IF EXISTS "Manage albums high roles" ON public.albums;
DROP POLICY IF EXISTS "Manage own albums role 1 and 2" ON public.albums;

-- 1. Enable album creation (INSERT) for legitimate roles
-- Includes Superadmin, Admin, Role 3, and Role 2.
CREATE POLICY "Enable album creation for authorized roles" ON public.albums
FOR INSERT 
TO authenticated
WITH CHECK (
  get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'role3'::app_role, 'role2'::app_role])
);

-- 2. Enable full management (ALL) for high roles
-- Allows Superadmin, Admin, and Role 3 to manage any album.
CREATE POLICY "Enable album management for high roles" ON public.albums
FOR ALL
TO authenticated
USING (
  get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'role3'::app_role])
)
WITH CHECK (
  get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'role3'::app_role])
);

-- 3. Enable management for owners (specifically for Role 2)
-- Allows Role 2 users to manage albums they have created.
CREATE POLICY "Enable album management for owners" ON public.albums
FOR ALL
TO authenticated
USING (
  (get_auth_role() = 'role2'::app_role AND owner_id = auth.uid())
)
WITH CHECK (
  (get_auth_role() = 'role2'::app_role AND owner_id = auth.uid())
);

-- Note: Role 1 and Viewer are intentionally excluded from INSERT/UPDATE/DELETE policies 
-- to comply with the requirement that they cannot create albums.
-- They still have access via the existing "Select albums access" policy.