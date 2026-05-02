import { Comic, Album, AppRole, UserManagementRecord } from "./types";
import { supabase } from "./lib/supabase";

/**
 * Enhanced retry wrapper for database operations
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message?.toLowerCase() || "";
    
    // Retry on common connection/performance issues
    const shouldRetry = 
      error.name === 'AbortError' || 
      errorMsg.includes('timeout') || 
      errorMsg.includes('abort') ||
      errorMsg.includes('canceling statement') || // Handle DB-side timeouts
      error.code === 'PGRST100' ||
      error.code === '57014'; // Postgres statement timeout code

    if (retries > 0 && shouldRetry) {
      console.warn(`[Retry] Operation failed, retrying in ${delay}ms... (${retries} attempts left). Error: ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Fetch all albums.
 */
export async function fetchAlbums(): Promise<Album[]> {
  return withRetry(async () => {
    // Fetch albums
    const { data: albumsData, error: albumsError } = await supabase
      .from('albums')
      .select('*');

    if (albumsError) throw albumsError;
    if (!albumsData) return [];

    // Fetch invitations
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('album_invitations')
      .select('*');
    
    const invitationsMap: Record<string, any[]> = {};
    if (!invitationsError && invitationsData) {
      invitationsData.forEach((inv: any) => {
        if (!invitationsMap[inv.album_id]) invitationsMap[inv.album_id] = [];
        invitationsMap[inv.album_id].push({
          email: inv.email,
          enabled: inv.enabled
        });
      });
    }

    // Fetch profiles
    const ownerIds = Array.from(new Set(albumsData.map((a: any) => a.owner_id))).filter(Boolean);
    
    let profilesMap: Record<string, any> = {};
    if (ownerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ownerIds);

      if (!profilesError && profilesData) {
        profilesMap = profilesData.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    return albumsData.map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description || "",
      coverUrl: a.cover_url || "",
      soundtrackUrl: a.soundtrack_url || "",
      createdAt: a.created_at,
      privacy: a.privacy,
      isEnabled: a.is_enabled,
      author: profilesMap[a.owner_id] ? {
        name: profilesMap[a.owner_id].full_name || "Unknown Author",
        avatarUrl: profilesMap[a.owner_id].avatar_url
      } : {
        name: "Gebeya Dala",
        avatarUrl: ""
      },
      invitedAccess: invitationsMap[a.id] || []
    }));
  });
}

/**
 * Fetch all comics (episodes)
 */
export async function fetchComics(): Promise<Comic[]> {
  return withRetry(async () => {
    const { data: comicsData, error: comicsError } = await supabase
      .from('comics')
      .select('id, title, cover_url, illustration_urls, notes, created_at, enabled, deleted, audio_import_link, illustration_import_link, album_id')
      .order('created_at', { ascending: false });

    if (comicsError) throw comicsError;
    if (!comicsData) return [];

    return comicsData.map((c: any) => ({
      id: c.id,
      title: c.title,
      audioUrl: undefined, // Lazy loaded
      coverUrl: c.cover_url || "",
      illustrationUrls: c.illustration_urls || [],
      notes: c.notes || "",
      createdAt: c.created_at,
      enabled: c.enabled,
      deleted: c.deleted,
      audioImportLink: c.audio_import_link || "",
      illustrationImportLink: c.illustration_import_link || "",
      albumId: c.album_id
    }));
  });
}

/**
 * Lazy load audio for a specific comic
 */
export async function fetchComicAudio(comicId: string): Promise<string | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('comics')
      .select('audio_url')
      .eq('id', comicId)
      .single();
    
    if (error) throw error;
    return data?.audio_url || null;
  });
}

/**
 * Admin: Fetch user role
 */
export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data.role as AppRole;
  });
}

/**
 * Admin: Fetch all users
 */
export async function fetchAllUsers(): Promise<UserManagementRecord[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*');

    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.user_id || item.profile_id || item.id,
      userId: item.user_id,
      role: item.role,
      email: item.email || 'No email found',
      name: item.name || item.full_name || '',
      isEnabled: item.is_enabled ?? true,
      createdAt: item.created_at || new Date().toISOString()
    }));
  });
}