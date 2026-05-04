import { Comic, Album, AppRole, UserManagementRecord } from "./types";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

/**
 * Fetch all albums from Supabase.
 * No mock data fallback - throws error if fetching fails.
 */
export async function fetchAlbums(): Promise<Album[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  try {
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

    if (albumsError) {
      console.error("Supabase fetchAlbums error:", albumsError);
      throw albumsError;
    }

    if (!albumsData) {
      return [];
    }

    return albumsData.map((album: any) => ({
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
  } catch (error: any) {
    console.error("Failed to fetch albums from Supabase:", error);
    throw new Error(error.message || "Failed to fetch albums from database.");
  }
}

/**
 * Fetch all comics (episodes) from Supabase.
 * Optimized: Does not fetch audio_url initially to speed up loading.
 */
export async function fetchComics(albumId?: string): Promise<Comic[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  try {
    let query = supabase
      .from('comics')
      .select('id, album_id, title, cover_url, illustration_urls, notes, created_at, enabled, deleted, audio_import_link, illustration_import_link')
      .eq('deleted', false);
    
    if (albumId) {
      query = query.eq('album_id', albumId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error("Supabase fetchComics error:", error);
      throw error;
    }

    if (!data) {
      return [];
    }

    return data.map((comic: any) => ({
      id: comic.id,
      albumId: comic.album_id,
      title: comic.title,
      coverUrl: comic.cover_url,
      illustrationUrls: comic.illustration_urls || [],
      notes: comic.notes,
      createdAt: comic.created_at,
      enabled: comic.enabled,
      deleted: comic.deleted,
      audioImportLink: comic.audio_import_link,
      illustrationImportLink: comic.illustration_import_link
    }));
  } catch (error: any) {
    console.error("Failed to fetch comics from Supabase:", error);
    throw new Error(error.message || "Failed to fetch comics from database.");
  }
}

/**
 * Fetch audio for a specific comic.
 */
export async function fetchComicAudio(comicId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('comics')
      .select('audio_url')
      .eq('id', comicId)
      .single();
    
    if (error) throw error;
    return data.audio_url;
  } catch (error) {
    console.error(`Failed to fetch audio for comic ${comicId}:`, error);
    return null;
  }
}

/**
 * Fetch user role.
 */
export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  if (!isSupabaseConfigured()) {
    return "viewer";
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) return "viewer";
    return data.role as AppRole;
  } catch {
    return "viewer";
  }
}

/**
 * Fetch all users for management.
 */
export async function fetchAllUsers(): Promise<UserManagementRecord[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (
          role
        )
      `);

    if (error) {
      console.error("Supabase fetchAllUsers error:", error);
      throw error;
    }

    return (data || []).map((profile: any) => ({
      ...profile,
      userId: profile.id,
      role: profile.user_roles?.[0]?.role || 'viewer'
    }));
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    throw new Error(error.message || "Failed to fetch users from database.");
  }
}