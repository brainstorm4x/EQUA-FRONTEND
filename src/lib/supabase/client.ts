/**
 * EQUA Frontend Supabase Client
 * 
 * Initializes and exports the Supabase client for database operations.
 * Uses environment variables for configuration.
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Creates or returns the Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[EQUA DB] Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // We handle auth separately with wallet
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-application-name': 'equa-frontend',
        },
      },
    });
  }
  return supabaseClient;
}

/**
 * Export the client as a named export for convenience
 */
export const supabase = getSupabaseClient();

/**
 * Check if Supabase is available/online
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false;
  }
  
  try {
    const { error } = await supabase.from('global_state').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Export configuration status for reference
 */
export const supabaseConfig = {
  isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
  url: SUPABASE_URL ? SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0] + '...' : 'not configured',
};
