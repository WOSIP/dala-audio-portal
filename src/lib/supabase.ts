import { createClient } from "@supabase/supabase-js";
import { AppRole } from "../types";

/**
 * Supabase Configuration
 * 
 * Using environment variables for security and flexibility.
 * Increased connection timeout to 360 seconds for stability.
 * Added retry logic with exponential backoff for reliability.
 * 
 * SECURITY NOTE: Local database connections are strictly prohibited.
 */

// Prioritize production environment variables as per requirements
const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3dsaXlybHBkcmtzcnp3Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk2MDEsImV4cCI6MjA5MDY0NTYwMX0._Vjy1IZNXVGjpJYoXcZTSwTwJGJUVgCqU_NBtX8GPEA';

/**
 * Validates that the Supabase URL is not pointing to a local instance.
 */
const validateSupabaseUrl = (url: string) => {
  if (!url) return;
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    const isLocal = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0' || 
      hostname === '[::1]' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

    if (isLocal) {
      const errorMsg = "Local database connection detected and blocked. Only online production database is allowed.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (err: any) {
    if (err.message.includes("Local database")) throw err;
  }
};

// Execute validation
validateSupabaseUrl(supabaseUrl);

const FETCH_TIMEOUT_MS = 360000; // 360 seconds
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000;

/**
 * Custom fetch implementation with extended timeout and retry logic.
 */
const customFetch = async (
  url: string | URL | Request,
  options: RequestInit = {},
  attempt: number = 1
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok && (response.status >= 500 || response.status === 429) && attempt < MAX_RETRIES) {
      const errorData = await response.clone().text();
      console.warn(`Fetch attempt ${attempt} failed with status ${response.status}: ${errorData}. Retrying...`);
      throw new Error(`Server Error (${response.status})`);
    }

    return response;
  } catch (err: any) {
    const isAbortError = err.name === 'AbortError';
    const isNetworkError = err.message?.toLowerCase().includes('fetch') || err.name === 'TypeError';
    
    if (attempt >= MAX_RETRIES) {
      console.error(`Final fetch attempt failed: ${err.message}`);
      throw err;
    }

    const shouldRetry = isAbortError || isNetworkError || err.message.includes('Server Error');

    if (shouldRetry) {
      const delay = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
      console.warn(`Fetch attempt ${attempt} ${isAbortError ? 'timed out' : 'failed'}: ${err.message}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return customFetch(url, options, attempt + 1);
    }
    
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase credentials missing! Connection will fail.");
} else {
  console.log("Supabase client initialized with production configuration.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: customFetch
  }
});

/**
 * Robust sign-in with retry logic.
 */
export const signInWithRetry = async (credentials: { email: string; password: string }) => {
  const MAX_AUTH_RETRIES = 3;
  const AUTH_BACKOFF = 2000;

  for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (error) {
        const isNetworkError = 
          error.message?.toLowerCase().includes('fetch') || 
          error.message?.toLowerCase().includes('network') ||
          error.status === 0 ||
          !error.status;

        if (isNetworkError && attempt < MAX_AUTH_RETRIES) {
          const delay = AUTH_BACKOFF * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { data, error };
      }
      
      return { data, error: null };
    } catch (err: any) {
      const isNetworkError = err.message?.toLowerCase().includes('fetch') || err.name === 'TypeError';

      if (isNetworkError && attempt < MAX_AUTH_RETRIES) {
        const delay = AUTH_BACKOFF * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  
  return { data: { user: null, session: null }, error: { message: "Failed to connect to authentication server after multiple attempts.", status: 0 } as any };
};

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');
};

/**
 * Verifies connectivity to the online database.
 */
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('albums').select('id').limit(1);
    if (error) {
      console.error("Database connection check failed:", error.message);
      throw error;
    }
    return { status: 'connected', message: 'Database is online and accessible.' };
  } catch (err: any) {
    console.error("Database connection check error:", err.message);
    return { status: 'error', message: `Failed to connect to database: ${err.message}` };
  }
};

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

export const updateUserStatus = async (userId: string, isEnabled: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_enabled: isEnabled })
    .eq('id', userId);
  
  if (error) throw error;
};

export const updateUserProfile = async (userId: string, data: { full_name?: string; avatar_url?: string }) => {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);
  
  if (error) throw error;
};

export const updateUserRole = async (userId: string, role: AppRole) => {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role })
    .eq('user_id', userId);
  
  if (error) throw error;
};

export const updateUserPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({
    password: password
  });
  
  if (error) throw error;
};

export const createUserByEmail = async (email: string, fullName: string, role: AppRole) => {
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