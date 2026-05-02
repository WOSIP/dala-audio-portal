export interface Album {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  owner_id: string;
  created_at: string;
  album_invitations?: AlbumInvitation[];
}

export interface AlbumInvitation {
  id: string;
  album_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export interface Comic {
  id: string;
  title: string;
  cover_url?: string;
  illustration_urls?: string[];
  notes?: string;
  created_at: string;
  enabled: boolean;
  deleted: boolean;
  audio_import_link?: string;
  illustration_import_link?: string;
  album_id: string;
}