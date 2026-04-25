import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3dsaXlybHBkcmtzcnp3Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk2MDEsImV4cCI6MjA5MDY0NTYwMX0._Vjy1IZNXVGjpJYoXcZTSwTwJGJUVgCqU_NBtX8GPEA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * File Upload Helper
 */
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
    
  return publicUrl;
};

/**
 * User Management Functions
 */

export const createUserByEmail = async (email: string, name: string, role: string, password?: string) => {
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const { data, error: signUpError } = await tempClient.auth.signUp({
    email,
    password: password || 'temp-pass-' + Math.random().toString(36).slice(-8),
    options: {
      data: {
        full_name: name,
        role: role
      }
    }
  });

  if (signUpError) throw signUpError;
  if (!data.user) throw new Error("Failed to create user record");

  if (password) {
    try {
      await supabase
        .from('profiles')
        .update({ password_hash: password })
        .eq('id', data.user.id);
    } catch (e) {
      console.warn("Could not update password_hash in profiles:", e);
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    return {
      id: data.user.id,
      email: data.user.email,
      full_name: name,
      is_enabled: true
    };
  }

  return profile;
};

export const updateUserStatus = async (userId: string, isEnabled: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_enabled: isEnabled })
    .eq('id', userId);
  
  if (error) throw error;
};

export const toggleUserStatus = updateUserStatus;

export const updateUserProfile = async (userId: string, updates: { name?: string, role?: string }) => {
  if (updates.name !== undefined) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: updates.name })
      .eq('id', userId);
    if (profileError) throw profileError;
  }

  if (updates.role !== undefined) {
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ role: updates.role })
      .eq('user_id', userId);
    if (roleError) throw roleError;
  }
};

export const updateUserPassword = async (userId: string, password: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ password_hash: password })
    .eq('id', userId);

  if (error) throw error;
};

/**
 * Album Management Functions
 */

export const updateAlbum = async (id: string, updates: any) => {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
  if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;
  if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('albums')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
  }

  if (updates.invitedAccess !== undefined) {
    await supabase.from('album_invitations').delete().eq('album_id', id);
    if (updates.invitedAccess.length > 0) {
      const { error: invError } = await supabase
        .from('album_invitations')
        .insert(updates.invitedAccess.map((i: any) => ({
          album_id: id,
          email: i.email,
          enabled: i.enabled
        })));
      if (invError) throw invError;
    }
  }
};

export const deleteAlbum = async (id: string) => {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

/**
 * Comic Management Functions
 */

export const updateComic = async (id: string, updates: any) => {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.audioUrl !== undefined) dbUpdates.audio_url = updates.audioUrl;
  if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
  if (updates.illustrationUrls !== undefined) dbUpdates.illustration_urls = updates.illustrationUrls;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.albumId !== undefined) dbUpdates.album_id = updates.albumId;
  if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
  if (updates.deleted !== undefined) dbUpdates.deleted = updates.deleted;

  // Update comic metadata
  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('comics')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
  }
};

export const deleteComic = async (id: string) => {
  const { error } = await supabase
    .from('comics')
    .update({ deleted: true })
    .eq('id', id);
  if (error) throw error;
};