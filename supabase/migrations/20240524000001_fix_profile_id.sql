-- Migration: Fix null value error for profiles.id and restore profile/role creation trigger
-- This fixes the error where inserting into profiles without an id would fail.

-- 1. Ensure id column is primary key and has a default value
-- Note: Primary key already exists based on inspection, so we just add the default
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Clean up previous trigger and function to avoid confusion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- 3. Create a comprehensive handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Determine initial role
  IF (LOWER(NEW.email) = 'kristalwos@gmail.com') THEN
    v_role := 'admin'::public.app_role;
  ELSE
    -- Check if a role was provided in metadata, otherwise default to viewer
    BEGIN
      v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'viewer'::public.app_role);
    EXCEPTION WHEN OTHERS THEN
      v_role := 'viewer'::public.app_role;
    END;
  END IF;

  -- Create profile
  -- We use ON CONFLICT DO NOTHING in case the profile was pre-created manually
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

-- 4. Re-apply the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill any orphaned profiles or roles (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::public.app_role
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload schema';