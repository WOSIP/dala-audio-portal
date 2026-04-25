-- Drop the existing albums table and its dependencies
DROP TABLE IF EXISTS public.albums CASCADE;

-- Recreate the albums table with a clean schema
CREATE TABLE public.albums (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  cover_url text,
  privacy privacy_status DEFAULT 'public'::privacy_status,
  owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Re-establish foreign keys from other tables
ALTER TABLE public.comics 
  ADD CONSTRAINT comics_album_id_fkey 
  FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;

ALTER TABLE public.album_invitations 
  ADD CONSTRAINT album_invitations_album_id_fkey 
  FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Restore Policies
CREATE POLICY "Admins can manage all albums" ON public.albums
  FOR ALL TO authenticated
  USING (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role]))
  WITH CHECK (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role]));

CREATE POLICY "Allow any authenticated user to create albums" ON public.albums
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can manage their albums" ON public.albums
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Universal select access for albums" ON public.albums
  FOR SELECT TO public
  USING (
    (privacy = 'public'::privacy_status) OR 
    (
      (auth.role() = 'authenticated'::text) AND 
      (
        (get_auth_role() = ANY (ARRAY['superadmin'::app_role, 'admin'::app_role, 'editor'::app_role, 'role3'::app_role, 'role2'::app_role, 'role1'::app_role])) OR 
        (owner_id = auth.uid()) OR 
        (EXISTS ( SELECT 1 FROM album_invitations WHERE ((album_invitations.album_id = albums.id) AND (album_invitations.email = (auth.jwt() ->> 'email'::text)) AND (album_invitations.enabled = true))))
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS albums_owner_id_idx ON public.albums(owner_id);