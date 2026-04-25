-- Migration: Enable/Disable Users
-- Description: Ensures the is_enabled column exists and updates RLS to respect it.

-- 1. Ensure is_enabled column exists on profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Create helper function to check if current user is enabled
CREATE OR REPLACE FUNCTION public.is_enabled()
RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_enabled INTO v_enabled FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update get_auth_role() to return 'viewer' if user is disabled
-- This effectively downgrades their permissions for any policy checking roles.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role AS $$
DECLARE
  v_role public.app_role;
  v_email text;
  v_enabled boolean;
BEGIN
  -- Check if user is enabled
  SELECT is_enabled INTO v_enabled FROM public.profiles WHERE id = auth.uid();
  
  -- If user is disabled, return 'viewer' role (minimal permissions)
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;
  
  RETURN 'viewer'::public.app_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update specific policies that don't use get_auth_role() but check auth.uid()
-- These are the "Users can manage their own X" policies.

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id AND is_enabled = true)
    WITH CHECK (auth.uid() = id AND is_enabled = true);

-- Albums (Authenticated users can manage their own albums)
DROP POLICY IF EXISTS "Authenticated users can manage their own albums" ON public.albums;
CREATE POLICY "Authenticated users can manage their own albums" ON public.albums
    FOR ALL
    USING (owner_id = auth.uid() AND public.is_enabled())
    WITH CHECK (owner_id = auth.uid() AND public.is_enabled());

-- Job Seekers (Users can update own profile)
DROP POLICY IF EXISTS "Users can update own profile" ON public.job_seekers;
CREATE POLICY "Users can update own profile" ON public.job_seekers
    FOR UPDATE
    USING (auth.uid() = user_id AND public.is_enabled())
    WITH CHECK (auth.uid() = user_id AND public.is_enabled());

DROP POLICY IF EXISTS "Users can delete own profile" ON public.job_seekers;
CREATE POLICY "Users can delete own profile" ON public.job_seekers
    FOR DELETE
    USING (auth.uid() = user_id AND public.is_enabled());