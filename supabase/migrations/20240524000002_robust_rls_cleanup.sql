-- Migration: Robust Superadmin Permissions and RLS Cleanup
-- Description: Consolidates and simplifies RLS policies across critical tables.

-- 1. CLEANUP: Drop all existing policies to ensure a clean state
DO $$ 
BEGIN
    -- user_roles
    DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins and superadmins can view all roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins and superadmins can manage roles" ON public.user_roles;
    
    -- albums
    DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
    DROP POLICY IF EXISTS "Create albums restricted" ON public.albums;
    DROP POLICY IF EXISTS "Delete albums restricted" ON public.albums;
    DROP POLICY IF EXISTS "Owners can update their albums" ON public.albums;
    DROP POLICY IF EXISTS "Update albums restricted" ON public.albums;
    DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;
    DROP POLICY IF EXISTS "View albums based on role" ON public.albums;
    DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON public.albums;
    DROP POLICY IF EXISTS "Invited users can view private albums" ON public.albums;
    DROP POLICY IF EXISTS "Role 1 and 2 update own albums" ON public.albums;
    DROP POLICY IF EXISTS "General select access for albums" ON public.albums;
    DROP POLICY IF EXISTS "Superadmin and Role 3 full access on albums" ON public.albums;
    
    -- comics
    DROP POLICY IF EXISTS "Admins and editors can manage comics" ON public.comics;
    DROP POLICY IF EXISTS "Create comics restricted" ON public.comics;
    DROP POLICY IF EXISTS "Comics are viewable if album is viewable" ON public.comics;
    DROP POLICY IF EXISTS "Allow public read for active comics" ON public.comics;
    DROP POLICY IF EXISTS "Allow authenticated full access" ON public.comics;
    DROP POLICY IF EXISTS "Owners can manage comics" ON public.comics;
    DROP POLICY IF EXISTS "View comics if album is visible" ON public.comics;
    DROP POLICY IF EXISTS "Public can view enabled comics" ON public.comics;
    DROP POLICY IF EXISTS "Insert comics based on role" ON public.comics;
    DROP POLICY IF EXISTS "Update comics based on role" ON public.comics;
    DROP POLICY IF EXISTS "Delete comics restricted" ON public.comics;
    DROP POLICY IF EXISTS "Superadmin and Role 3 full access on comics" ON public.comics;
    DROP POLICY IF EXISTS "Role 1 and 2 update comics in own albums" ON public.comics;
    DROP POLICY IF EXISTS "General select access for comics" ON public.comics;
    
    -- album_invitations
    DROP POLICY IF EXISTS "Owners can manage invitations" ON public.album_invitations;
    DROP POLICY IF EXISTS "Users can see their own invitations" ON public.album_invitations;
    DROP POLICY IF EXISTS "Superadmin and owners can manage invitations" ON public.album_invitations;
    DROP POLICY IF EXISTS "Users can see own invitations" ON public.album_invitations;
END $$;

-- 2. RECREATE: User Roles Policies
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Superadmins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role));
CREATE POLICY "Superadmins manage all roles" ON public.user_roles FOR ALL TO authenticated USING (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role)) WITH CHECK (get_auth_role() IN ('admin'::app_role, 'superadmin'::app_role));

-- 3. RECREATE: Albums Policies
-- Full access for high-level roles
CREATE POLICY "Superadmin and Role 3 manage albums" ON public.albums FOR ALL TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

-- Role 1 and 2 can update their own albums
CREATE POLICY "Role 1 and 2 update own albums" ON public.albums FOR UPDATE TO authenticated 
USING (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND owner_id = auth.uid()) 
WITH CHECK (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND owner_id = auth.uid());

-- Universal SELECT policy for albums
CREATE POLICY "Select albums access" ON public.albums FOR SELECT TO public 
USING (
  privacy = 'public'::privacy_status OR 
  (auth.role() = 'authenticated' AND (
    get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.album_invitations WHERE album_id = albums.id AND email = (auth.jwt() ->> 'email') AND enabled = true)
  ))
);

-- 4. RECREATE: Album Invitations Policies
CREATE POLICY "Manage invitations" ON public.album_invitations FOR ALL TO authenticated 
USING (get_auth_role() = 'superadmin'::app_role OR get_album_owner(album_id) = auth.uid()) 
WITH CHECK (get_auth_role() = 'superadmin'::app_role OR get_album_owner(album_id) = auth.uid());

CREATE POLICY "View own invitations" ON public.album_invitations FOR SELECT TO authenticated 
USING (email = (auth.jwt() ->> 'email'));

-- 5. RECREATE: Comics Policies
-- Full access for high-level roles
CREATE POLICY "Superadmin and Role 3 manage comics" ON public.comics FOR ALL TO authenticated 
USING (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role)) 
WITH CHECK (get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role));

-- Role 1 and 2 update comics in own albums
CREATE POLICY "Role 1 and 2 update comics in own albums" ON public.comics FOR UPDATE TO authenticated 
USING (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND get_album_owner(album_id) = auth.uid()) 
WITH CHECK (get_auth_role() IN ('role1'::app_role, 'role2'::app_role) AND get_album_owner(album_id) = auth.uid());

-- Universal SELECT policy for comics
CREATE POLICY "Select comics access" ON public.comics FOR SELECT TO public 
USING (
  get_auth_role() IN ('superadmin'::app_role, 'role3'::app_role, 'role2'::app_role) OR 
  get_album_owner(album_id) = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE id = comics.album_id AND (
      privacy = 'public'::privacy_status OR 
      EXISTS (SELECT 1 FROM public.album_invitations WHERE album_id = albums.id AND email = (auth.jwt() ->> 'email') AND enabled = true)
    )
  )
);