import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3dsaXlybHBkcmtzcnp3Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk2MDEsImV4cCI6MjA5MDY0NTYwMX0._Vjy1IZNXVGjpJYoXcZTSwTwJGJUVgCqU_NBtX8GPEA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-application-name': 'comic-reader' },
  },
  db: {
    schema: 'public',
  },
});

/**
 * Robust fetch wrapper with retries and timeout handling
 */
export async function robustFetch<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries = 3,
  delay = 1000
): Promise<T | null> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await queryFn();
      if (error) {
        // If it's a timeout, we definitely want to retry
        if (error.message?.includes('timeout') || error.code === '522') {
          console.warn(`Database timeout (attempt ${i + 1}/${retries}). Retrying...`);
          await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
      return data;
    } catch (err) {
      lastError = err;
      console.error(`Fetch attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  }
  
  console.error('All fetch attempts failed. Final error:', lastError);
  return null;
}