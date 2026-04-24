import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhcwliyrlpdrksrzwcbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3dsaXlybHBkcmtzcnp3Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk2MDEsImV4cCI6MjA5MDY0NTYwMX0._Vjy1IZNXVGjpJYoXcZTSwTwJGJUVgCqU_NBtX8GPEA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);