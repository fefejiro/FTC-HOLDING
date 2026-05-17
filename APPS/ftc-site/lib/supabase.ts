import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    if (typeof window === 'undefined') {
      throw new Error('getSupabase() called on server; use createServerClient instead');
    }
    if (!supabaseUrl) {
      throw new Error("Public Supabase URL is required. Set NEXT_PUBLIC_SUPABASE_URL.");
    }
    if (!supabaseAnonKey) {
      throw new Error("Public Supabase anon key is required. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export default getSupabase;
