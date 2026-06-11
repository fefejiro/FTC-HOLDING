import { hasPublicSupabaseConfig } from "./supabase";

export function isGardenPortalAuthConfigured(): boolean {
  return hasPublicSupabaseConfig();
}
