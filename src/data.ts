import { Comic, Album, AppRole, UserManagementRecord } from "./types";
import { supabase } from "./lib/supabase";

/**
 * Fetch all albums from Supabase.
 */
export async function fetchAlbums(): Promise<Album[]> {
  const { data: albumsData, error: albumsError } = await supabase
    .from('albums')
    .select(`
      *,
      profiles:owner_id (
        full_name,
        avatar_url
      ),
      album_invitations (
        email,
        enabled
      )
    `)
    .eq('is_enabled', true)
    .order('created_at', { ascending: false });

  if (albumsError) throw albumsError;

  return (albumsData || []).map((album: any) => ({
    id: album.id,
    title: album.title,
    description: album.description,
    coverUrl: album.cover_url,
    soundtrackUrl: album.soundtrack_url,
    createdAt: album.created_at,
    privacy: album.privacy,
    isEnabled: album.is_enabled,
    author: {
      name: album.profiles?.full_name || 'Unknown Author',
      avatarUrl: album.profiles?.avatar_url
    },
    invitedAccess: album.album_invitations?.map((inv: any) => ({
      email: inv.email,
      enabled: inv.enabled
    })) || []
  }));
}

/**
 * Fetch all comics (episodes) from Supabase.
 */
export async function fetchComics(): Promise<Comic[]> {
  const { data, error } = await supabase
    .from('comics')
    .select('*')
    .eq('deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((comic: any) => ({
    id: comic.id,
    albumId: comic.album_id,
    title: comic.title,
    audioUrl: comic.audio_url,
    coverUrl: comic.cover_url,
    illustrationUrls: comic.illustration_urls || [],
    notes: comic.notes,
    createdAt: comic.created_at,
    enabled: comic.enabled,
    deleted: comic.deleted,
    audioImportLink: comic.audio_import_link,
    illustrationImportLink: comic.illustration_import_link
  }));
}

/**
 * Fetch audio for a specific comic.
 */
export async function fetchComicAudio(comicId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('comics')
    .select('audio_url')
    .eq('id', comicId)
    .single();
  
  if (error) return null;
  return data.audio_url;
}

/**
 * Fetch user role.
 */
export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error) return "viewer";
  return data.role as AppRole;
}

/**
 * Fetch all users for management.
 */
export async function fetchAllUsers(): Promise<UserManagementRecord[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_roles (
        role
      )
    `);

  if (error) throw error;

  return (data || []).map((profile: any) => ({
    ...profile,
    userId: profile.id,
    role: profile.user_roles?.[0]?.role || 'viewer'
  }));
}