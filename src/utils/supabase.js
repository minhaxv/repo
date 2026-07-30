import { createClient } from '@supabase/supabase-js';

// Retrieve credentials supporting both Vite prefix, next standard variables, and publishable key naming
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("WARNING: Supabase URL or Anon/Publishable Key is missing! Check your local .env file or Vercel Environment Variables.");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

