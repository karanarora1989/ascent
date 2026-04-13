import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Using public schema (default)
const SCHEMA = 'public';

// Client-side Supabase (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: SCHEMA },
});

// Server-side Supabase (service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: SCHEMA },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default export for convenience
export const db = supabaseAdmin;
