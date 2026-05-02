-- NUCLEAR OPTION: Restore Database Connectivity
-- This migration disables RLS on all tables and drops all policies to break any recursion loops.

-- 1. Disable RLS on all tables
DO $$ 
DECLARE 
    t RECORD;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

-- 2. Drop all policies
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Replace the role function with a completely static one
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS text 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN 'viewer';
END;
$$;