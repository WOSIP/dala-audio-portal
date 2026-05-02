import { supabase, robustFetch } from './lib/supabase';
import { Album, Comic } from './types';

export async function fetchAlbums(): Promise<Album[]> {
  const data = await robustFetch<Album[]>(() => 
    supabase
      .from('albums')
      .select('*, album_invitations(*)')
      .order('created_at', { ascending: false })
  );
  
  return data || [];
}

export async function fetchComics(): Promise<Comic[]> {
  const data = await robustFetch<Comic[]>(() =>
    supabase
      .from('comics')
      .select(`
        id,
        title,
        cover_url,
        illustration_urls,
        notes,
        created_at,
        enabled,
        deleted,
        audio_import_link,
        illustration_import_link,
        album_id
      `)
      .order('created_at', { ascending: false })
  );
  
  return data || [];
}

/**
 * Optimized fetching that prioritizes albums then comics
 */
export async function fetchAllData() {
  console.log('Starting optimized data fetch...');
  
  // Fetch albums first as they are needed for the catalog
  const albums = await fetchAlbums();
  
  // Then fetch comics
  const comics = await fetchComics();
  
  return { albums, comics };
}