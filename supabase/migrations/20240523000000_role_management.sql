-- 1. Create the custom types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'editor', 'viewer');
    END IF;
END $$;

-- 2. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT EXISTS,
  role app_role DEFAULT 'viewer'::app_role NOT NULL,
  UNIQUE(user_id)
);

-- Note: Table was already created, but we ensure constraints and defaults

-- 3. Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 4. Trigger to automatically create a viewer role for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Ensure trigger exists on auth.users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM medical_information_schema.triggers WHERE trigger_name = 'on_auth_user_created_role') THEN
        CREATE TRIGGER on_auth_user_created_role
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- If we can't see medical_information_schema (different schema names in some envs), we try to drop and create
        DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
        CREATE TRIGGER on_auth_user_created_role
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
END $$;

-- 5. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Policies for user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (get_auth_role() = 'admin'::app_role);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (get_auth_role() = 'admin'::app_role)
WITH CHECK (get_auth_role() = 'admin'::app_role);

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. View for easy access to user emails and roles (for Admin Panel)
CREATE OR REPLACE VIEW public.user_permissions AS
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id;

-- 8. Update RLS policies for Albums and Comics to respect roles
-- Albums
DROP POLICY IF EXISTS "Admins and editors can manage albums" ON public.albums;
CREATE POLICY "Admins and editors can manage albums"
ON public.albums
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin'::app_role, 'editor'::app_role))
WITH CHECK (get_auth_role() IN ('admin'::app_role, 'editor'::app_role));

DROP POLICY IF EXISTS "Public can view albums" ON public.albums;
CREATE POLICY "Public can view albums"
ON public.albums
FOR SELECT
TO public
USING (
  privacy = 'public' OR 
  owner_id = auth.uid() OR 
  get_auth_role() = 'admin'::app_role
);

-- Comics
DROP POLICY IF EXISTS "Admins and editors can manage comics" ON public.comics;
CREATE POLICY "Admins and editors can manage comics"
ON public.comics
FOR ALL
TO authenticated
USING (get_auth_role() IN ('admin'::app_role, 'editor'::app_role))
WITH CHECK (get_auth_role() IN ('admin'::app_role, 'editor'::app_role));

-- 9. Backfill existing users (from profiles to user_roles)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::app_role
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 10. (Optional) Promote first user to admin if no admins exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
        UPDATE public.user_roles 
        SET role = 'admin' 
        WHERE user_id IN (SELECT id FROM public.profiles LIMIT 1);
    END IF;
END $$;