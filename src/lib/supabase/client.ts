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

// Placeholder URL for when Supabase is not configured
// This prevents the Supabase client from throwing an error during build
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-key-for-build';

// Singleton client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Creates or returns the Supabase client singleton
 * Uses placeholder values when credentials are not configured to avoid build errors
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
    
    if (!isConfigured) {
      console.warn('[EQUA DB] Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. Using localStorage fallback.');
    }
    
    // Use actual credentials or placeholders
    const url = SUPABASE_URL || PLACEHOLDER_URL;
    const key = SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
    
    supabaseClient = createClient(url, key, {
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
 * Check if Supabase is properly configured (not using placeholders)
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Check if Supabase is available/online
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
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
  isConfigured: isSupabaseConfigured(),
  url: SUPABASE_URL ? SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0] + '...' : 'not configured',
};
