/**
 * EQUA Frontend Supabase Client
 * 
 * Initializes and exports the Supabase client for database operations.
 * Uses environment variables for configuration with fallback to hardcoded values.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// In production, use environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpmpybciyqdoxctvlyqn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbXB5YmNpeXFkb3hjdHZseXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODQxMzYsImV4cCI6MjA4MDA2MDEzNn0.D35XUatnJqnlpM7G3pWcECYXHV-pDdGweQLf5MPEChc';

// Singleton client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Creates or returns the Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
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
  try {
    const { error } = await supabase.from('global_state').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Export configuration for reference
 */
export const supabaseConfig = {
  url: SUPABASE_URL,
  // Don't expose the key in logs/errors
  hasKey: !!SUPABASE_ANON_KEY,
};
