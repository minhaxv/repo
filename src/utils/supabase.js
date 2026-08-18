import { createClient } from '@supabase/supabase-js';

// Retrieve credentials supporting both Vite prefix, next standard variables, and publishable key naming
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseUrl.includes('your-project-id')
);

if (!isSupabaseConfigured) {
  console.info("ℹ️ Supabase credentials not set in .env. Running in standalone mode. Paste your Supabase URL & Anon Key into .env when ready to connect live database.");
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
);

