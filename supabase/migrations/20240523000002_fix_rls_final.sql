-- 1. Ensure get_auth_role is robust and non-recursive
-- By using SECURITY DEFINER and a stable search path, we bypass RLS on user_roles
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- We query the table directly. SECURITY DEFINER ensures we bypass RLS of the caller.
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'viewer'::app_role);
END;
$$;

-- 2. Fix user_roles policies to prevent recursion
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Users can always see their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles - uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (get_auth_role() = 'admin'::app_role);

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (get_auth_role() = 'admin'::app_role)
WITH CHECK (get_auth_role() = 'admin'::app_role);

-- 3. Fix Albums policies to ensure creation works for authorized users
DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
DROP POLICY IF EXISTS "Owners can manage their albums" ON public.albums;

-- Owners can manage their own albums
-- This ensures that even if someone is not an admin/editor, they can still create their own albums
CREATE POLICY "Owners can manage their albums"
ON public.albums
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Admins and editors can manage all albums
CREATE POLICY "Admins and editors can manage albums"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin'::app_role, 'editor'::app_role))
WITH CHECK (get_auth_role() IN ('admin'::app_role, 'editor'::app_role));

-- 4. Sync user_roles only for valid auth users
-- This prevents the FK violation error
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::app_role
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 5. Promote superadmin if they exist in auth.users
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'kristalwos@gmail.com');