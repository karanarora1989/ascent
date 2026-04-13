import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SCHEMA = 'public';

// Lazy initialization - only creates client when accessed
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build time
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    throw new Error('Missing Supabase environment variables');
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: SCHEMA },
  });
  
  return supabaseInstance;
};

export const getSupabaseAdmin = () => {
  if (supabaseAdminInstance) return supabaseAdminInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    // Return a dummy client during build time
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    throw new Error('Missing Supabase admin environment variables');
  }
  
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: SCHEMA },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  return supabaseAdminInstance;
};

// For backward compatibility - use getters
export const supabase = getSupabase();
export const supabaseAdmin = getSupabaseAdmin();
export const db = supabaseAdmin;
