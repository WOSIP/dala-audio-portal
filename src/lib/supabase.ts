import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3dsaXlybHBkcmtzcnp3Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk2MDEsImV4cCI6MjA5MDY0NTYwMX0._Vjy1IZNXVGjpJYoXcZTSwTwJGJUVgCqU_NBtX8GPEA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * User Management Functions
 */

export const createUserByEmail = async (email: string, name: string, role: string, password?: string) => {
  // Use a temporary client to avoid signing out the current admin/user
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  // Create the auth user. The database trigger handle_new_user 
  // will automatically create the profile and user_roles records.
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

  // For consistency with updateUserPassword, we also store the password in the profiles table 
  // if the password_hash column exists.
  if (password) {
    try {
      await supabase
        .from('profiles')
        .update({ password_hash: password })
        .eq('id', data.user.id);
    } catch (e) {
      console.warn("Could not update password_hash in profiles (this is expected if RLS is tight and admin is not auth'd):", e);
    }
  }

  // Fetch the profile created by the trigger to return it
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    // If profile fetch fails (e.g. RLS), we return a synthetic profile based on the auth user
    return {
      id: data.user.id,
      email: data.user.email,
      full_name: name,
      is_enabled: true
    };
  }

  return profile;
};

/**
 * Updates a user's enabled/disabled status.
 */
export const updateUserStatus = async (userId: string, isEnabled: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_enabled: isEnabled })
    .eq('id', userId);
  
  if (error) throw error;
};

// Alias for backward compatibility if needed, though we will update AdminPanel
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

/**
 * Updates a user's password in the database.
 */
export const updateUserPassword = async (userId: string, password: string) => {
  // Update the profiles table password_hash field
  const { error } = await supabase
    .from('profiles')
    .update({ password_hash: password })
    .eq('id', userId);

  if (error) throw error;
};