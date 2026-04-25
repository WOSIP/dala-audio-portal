-- Migration: Regenerate Database
-- Description: Consolidates and resets the database schema, functions, and RLS policies 
-- based on the latest project requirements for user management, roles, and album/episode permissions.
-- Date: 2024-05-30

-- 1. CLEANUP (Drop existing objects to ensure a fresh start)
-- We use CASCADE to handle dependencies automatically.
DROP VIEW IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.album_invitations CASCADE;
DROP TABLE IF EXISTS public.comics CASCADE;
DROP TABLE IF EXISTS public.albums CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_album_owner(uuid) CASCADE;

-- Drop types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.privacy_status CASCADE;

-- 2. CUSTOM TYPES
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'user', 'role1', 'role2', 'role3');
CREATE TYPE public.privacy_status AS ENUM ('public', 'private');

-- 3. TABLES

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  password_hash TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Roles Table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL,
  UNIQUE(user_id)
);

-- Albums Table
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  privacy public.privacy_status DEFAULT 'public'::public.privacy_status,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comics (Episodes) Table
CREATE TABLE public.comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT,
  cover_url TEXT,
  illustration_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  audio_import_link TEXT,
  illustration_import_link TEXT,
  enabled BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Album Invitations Table
CREATE TABLE public.album_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. FUNCTIONS

-- Helper to get owner of an album
CREATE OR REPLACE FUNCTION public.get_album_owner(p_album_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT owner_id FROM public.albums WHERE id = p_album_id;
$$;

-- Robust function to get current user's role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_email text;
BEGIN
  -- 1. Check user_roles table directly
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Fallback to JWT email for designated superadmin bootstrapping
  v_email := auth.jwt() ->> 'email';
  IF LOWER(v_email) = 'kristalwos@gmail.com' THEN
    RETURN 'superadmin'::public.app_role;
  END IF;

  -- 3. Default fallback
  RETURN 'viewer'::public.app_role;
END;
$$;

-- Function to handle new user signup
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

-- 5. TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. VIEWS
CREATE OR REPLACE VIEW public.user_permissions AS
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name as name,
    p.is_enabled
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id;

-- 7. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_invitations ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- Profiles
CREATE POLICY "Admins and superadmins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles viewable by everyone"
ON public.profiles FOR SELECT USING (true);

-- User Roles
CREATE POLICY "Admins and superadmins manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Albums
CREATE POLICY "High-level roles management access"
ON public.albums FOR ALL TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'))
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'));

CREATE POLICY "Authenticated users can manage their own albums"
ON public.albums FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "Universal select access for albums"
ON public.albums FOR SELECT TO public
USING (
  privacy = 'public' OR 
  (auth.role() = 'authenticated' AND (
    get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3', 'role2', 'role1') OR 
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.album_invitations 
      WHERE album_id = albums.id 
      AND email = auth.jwt()->>'email' 
      AND enabled = true
    )
  ))
);

-- Comics
CREATE POLICY "High-level roles comic management"
ON public.comics FOR ALL TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'))
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'));

CREATE POLICY "Creator roles comic management"
ON public.comics FOR ALL TO authenticated
USING (get_auth_role() IN ('role1', 'role2') AND (get_album_owner(album_id) = auth.uid()))
WITH CHECK (get_auth_role() IN ('role1', 'role2') AND (get_album_owner(album_id) = auth.uid()));

CREATE POLICY "Select comics access"
ON public.comics FOR SELECT TO public
USING (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3', 'role2', 'role1') OR 
  get_album_owner(album_id) = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.albums 
    WHERE albums.id = comics.album_id 
    AND (
      albums.privacy = 'public' OR 
      EXISTS (
        SELECT 1 FROM public.album_invitations 
        WHERE album_id = albums.id 
        AND email = auth.jwt()->>'email' 
        AND enabled = true
      )
    )
  )
);

-- Album Invitations
CREATE POLICY "High-level roles invitation management"
ON public.album_invitations FOR ALL TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR get_album_owner(album_id) = auth.uid())
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR get_album_owner(album_id) = auth.uid());

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_albums_owner_id ON public.albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);

-- 10. BOOTSTRAP SUPERADMIN
-- Ensure the designated user is assigned the superadmin role if they exist.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::public.app_role
FROM auth.users
WHERE email = 'kristalwos@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';