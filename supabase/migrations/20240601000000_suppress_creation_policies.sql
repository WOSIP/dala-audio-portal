-- Migration: Suppress all row creation (INSERT) policies
-- Description: Drops all existing policies that allow row creation (INSERT or ALL) across all tables to allow for a clean rebuild.

-- 1. Profiles
DROP POLICY IF EXISTS "Admins and superadmins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. User Roles
DROP POLICY IF EXISTS "Admins and superadmins manage all roles" ON public.user_roles;

-- 3. Albums
DROP POLICY IF EXISTS "High-level roles management access" ON public.albums;
DROP POLICY IF EXISTS "Authenticated users can manage their own albums" ON public.albums;

-- 4. Comics (Episodes)
DROP POLICY IF EXISTS "High-level roles comic management" ON public.comics;
DROP POLICY IF EXISTS "Creator roles comic management" ON public.comics;

-- 5. Album Invitations
DROP POLICY IF EXISTS "High-level roles invitation management" ON public.album_invitations;

-- 6. Merchant / Shop Related (from database discovery)
DROP POLICY IF EXISTS "Allow anonymous merchant management" ON public.merchants;
DROP POLICY IF EXISTS "Owners can manage their merchant translations" ON public.merchant_translations;
DROP POLICY IF EXISTS "Allow management for owners and demo" ON public.transactions;
DROP POLICY IF EXISTS "Allow all management for credit_applications" ON public.credit_applications;
DROP POLICY IF EXISTS "Allow anonymous profile translations management" ON public.profile_translations;
DROP POLICY IF EXISTS "Users can insert their own translations" ON public.profile_translations;

-- 7. Job Related
DROP POLICY IF EXISTS "Users can insert own profile" ON public.job_seekers;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';