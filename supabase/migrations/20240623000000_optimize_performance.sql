-- Migration: Optimize Database Performance and Fix Timeouts
-- Description: Adds indexes for performance, optimizes the role fetching function, and increases statement timeout.

-- 1. Increase statement timeout for the project roles (anon, authenticated)
-- This gives more headroom for queries that might be slow due to cold starts or complex RLS.
-- 60s is usually the default, but we'll ensure it's at least that and explicitly set it.
ALTER ROLE anon SET statement_timeout = '60s';
ALTER ROLE authenticated SET statement_timeout = '60s';

-- 2. Add performance indexes on frequently used columns
-- Comics table optimizations
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics(album_id);
CREATE INDEX IF NOT EXISTS idx_comics_created_at ON public.comics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comics_enabled_deleted ON public.comics(enabled, deleted);

-- Albums table optimizations
CREATE INDEX IF NOT EXISTS idx_albums_owner_id ON public.albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_privacy ON public.albums(privacy);

-- Album Invitations optimizations
CREATE INDEX IF NOT EXISTS idx_album_invitations_album_id ON public.album_invitations(album_id);
CREATE INDEX IF NOT EXISTS idx_album_invitations_email ON public.album_invitations(email);

-- 3. Optimize get_auth_role function
-- Current version does multiple lookups. We can combine them into a single efficient query.
-- Using COALESCE and subqueries to minimize execution time.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.app_role 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Mark as stable for better performance in queries
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role public.app_role;
  v_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- If not logged in, return viewer immediately
  IF v_user_id IS NULL THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Use a single query to get both status and role
  -- We prioritize checking if they are enabled.
  SELECT 
    p.is_enabled,
    ur.role
  INTO v_enabled, v_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_user_id;

  -- If user is disabled, return viewer
  IF v_enabled IS FALSE THEN
    RETURN 'viewer'::public.app_role;
  END IF;

  -- Fallback for superadmin by email if no role found in table
  IF v_role IS NULL THEN
    IF LOWER(auth.jwt() ->> 'email') = 'kristalwos@gmail.com' THEN
      RETURN 'superadmin'::public.app_role;
    END IF;
    RETURN 'viewer'::public.app_role;
  END IF;
  
  RETURN v_role;
END;
$$;

-- 4. Ensure RLS policies are using the STABLE function
-- This allows Postgres to cache the result of get_auth_role() for the duration of a query
-- if the inputs (auth.uid()) don't change.

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';