import { createClient } from "@supabase/supabase-js";
import { AppRole } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. Please check your configuration.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

/**
 * Basic connection check
 */
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('albums').select('id').limit(1);
    if (error) throw error;
    return { status: 'connected', message: 'Database is online and accessible.' };
  } catch (err: any) {
    return { status: 'error', message: err.message || 'Failed to connect to database.' };
  }
};

/**
 * Upload a file to a specific storage bucket
 */
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

/**
 * User Management: Update a user's enabled status
 */
export const updateUserStatus = async (userId: string, isEnabled: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_enabled: isEnabled })
    .eq('id', userId);
  
  if (error) throw error;
};

/**
 * User Management: Update user profile information
 */
export const updateUserProfile = async (userId: string, data: { full_name?: string; avatar_url?: string }) => {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);
  
  if (error) throw error;
};

/**
 * User Management: Update user role
 */
export const updateUserRole = async (userId: string, role: AppRole) => {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role })
    .eq('user_id', userId);
  
  if (error) throw error;
};

/**
 * Auth: Update user password
 */
export const updateUserPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({
    password: password
  });
  
  if (error) throw error;
};

/**
 * Auth: Create a user placeholder in profiles (Real auth creation requires Admin API or signup)
 * In this context, we usually use an edge function or direct profile creation for invitations.
 */
export const createUserByEmail = async (email: string, fullName: string, role: AppRole) => {
  // Note: This only creates the profile/role. The actual auth user must sign up or be created via Admin API.
  // For the sake of the UI requirements, we'll try to use a RPC or just the profile insert if allowed.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([{ email, full_name: fullName, is_enabled: true }])
    .select()
    .single();

  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([{ user_id: profile.id, role }]);

  if (roleError) throw roleError;

  return profile;
};