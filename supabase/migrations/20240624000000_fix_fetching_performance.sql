-- Increase statement timeout to allow slightly longer queries during recovery
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '15s';

-- Add critical indexes to speed up common queries and JOINS
-- This prevents sequential scans on the comics table when filtering by album
CREATE INDEX IF NOT EXISTS idx_comics_album_id ON public.comics (album_id);

-- This speeds up the 'order by created_at desc' used in the fetching logic
CREATE INDEX IF NOT EXISTS idx_comics_created_at_desc ON public.comics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_created_at_desc ON public.albums (created_at DESC);

-- Index for album invitations to speed up the nested join
-- The logs showed 'albums?select=*,album_invitations(*)' which is a common bottleneck
CREATE INDEX IF NOT EXISTS idx_album_invitations_album_id ON public.album_invitations (album_id);

-- Optimize status checks
CREATE INDEX IF NOT EXISTS idx_comics_enabled_deleted ON public.comics (enabled, deleted);
CREATE INDEX IF NOT EXISTS idx_albums_enabled_deleted ON public.albums (enabled, deleted);

-- Ensure RLS doesn't do sequential scans by indexing user_id columns if they exist
-- We assume a standard user_id column based on typical Supabase RLS patterns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'albums' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums (user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comics' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_comics_user_id ON public.comics (user_id);
    END IF;
END $$;

-- Reload configuration
NOTIFY pgrst, 'reload config';