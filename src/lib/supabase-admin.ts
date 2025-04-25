import { createClient } from '@supabase/supabase-js';
import { type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

let supabaseAdmin: SupabaseClient<Database>;

/**
 * Initialize the Supabase Admin client
 * @returns Supabase admin client
 */
export function initSupabaseAdmin(): SupabaseClient<Database> {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }

  try {
    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Supabase Admin client initialized successfully');
    return supabaseAdmin;
  } catch (error: any) {
    console.error('Error initializing Supabase Admin client:', error);
    throw new Error(`Supabase Admin initialization error: ${error.message}`);
  }
}

/**
 * Get the Supabase Admin client
 * @returns Supabase admin client
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseAdmin) {
    return initSupabaseAdmin();
  }
  return supabaseAdmin;
}

export default { initSupabaseAdmin, getSupabaseAdmin }; 