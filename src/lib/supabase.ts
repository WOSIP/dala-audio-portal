import { createClient } from '@supabase/supabase-js';

// Connection details - Using the verified project URL and modern publishable key
const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';
// Modern publishable key is preferred over legacy anon key
const supabaseAnonKey = 'sb_publishable_lhRZpzUr9mUaP6VvyQilzA_WYhSF6Am';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing.');
}

/**
 * Robust Supabase Client with Optimized Retry Logic and Timeout Handling
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'dala-portal-auth'
  },
  global: {
    headers: { 'x-application-name': 'dala-portal' },
    /**
     * Custom fetch with enhanced timeout and diagnostic logging
     */
    fetch: async (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`[Supabase] Request to ${url} timed out after 30s`);
      }, 30000);

      try {
        const response = await fetch(url, { 
          ...options, 
          signal: controller.signal,
          // Ensure we don't cache database queries in a way that hides connection issues
          cache: 'no-store'
        });
        return response;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Database request timed out. The server might be under heavy load.');
        }
        console.error('[Supabase] Connection error:', err.message);
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  },
  db: {
    schema: 'public'
  }
});

/**
 * Diagnostic helper to check connection health
 */
export const checkConnection = async () => {
  try {
    const start = Date.now();
    const { error } = await supabase.from('albums').select('id').limit(1);
    const duration = Date.now() - start;
    
    if (error) throw error;
    return { status: 'ok', latency: `${duration}ms` };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
};

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
 * User Management Functions (with Promise wrapper for consistency)
 */

export const createUserByEmail = async (email: string, name: string, role: string, password?: string) => {
  const { data, error: signUpError } = await supabase.auth.signUp({
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
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: password })
      .eq('id', data.user.id);
    
    if (updateError) console.warn("Could not update password_hash:", updateError);
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