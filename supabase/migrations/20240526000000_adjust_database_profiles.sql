-- Migration: Adjust database schema and policies for profiles and roles
-- 1. Add password_hash column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Fix profiles RLS policies
-- Remove the dangerous anonymous policy
DROP POLICY IF EXISTS "Allow anonymous profile management" ON public.profiles;

-- Ensure superadmins have full access to profiles
DROP POLICY IF EXISTS "Superadmins can do everything on profiles" ON public.profiles;
CREATE POLICY "Superadmins can do everything on profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (get_auth_role() = 'superadmin'::app_role)
WITH CHECK (get_auth_role() = 'superadmin'::app_role);

-- 3. Update user_permissions view
DROP VIEW IF EXISTS public.user_permissions;
CREATE VIEW public.user_permissions AS
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name as name,
    p.is_enabled
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id;

-- 4. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_owner_id ON public.albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 5. Update handle_new_user function to assign 'superadmin' role to the main admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Determine initial role
  IF (LOWER(NEW.email) = 'kristalwos@gmail.com') THEN
    v_role := 'superadmin'::public.app_role;
  ELSE
    -- Check if a role was provided in metadata, otherwise default to viewer
    BEGIN
      v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'viewer'::public.app_role);
    EXCEPTION WHEN OTHERS THEN
      v_role := 'viewer'::public.app_role;
    END;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, avatar_url, is_enabled)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO UPDATE SET role = v_role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Upgrade existing designated admin to superadmin
UPDATE public.user_roles 
SET role = 'superadmin' 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'kristalwos@gmail.com');

-- 7. Update get_auth_role fallback to superadmin
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_email text;
BEGIN
  -- 1. Check user_roles table directly
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Fallback to JWT email for designated superadmin
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::app_role;
  END IF;

  -- 3. Default fallback
  RETURN 'viewer'::app_role;
END;
$$;

-- 8. Refresh schema cache
NOTIFY pgrst, 'reload schema';