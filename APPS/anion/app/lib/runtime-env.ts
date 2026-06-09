import { getCloudflareContext } from '@opennextjs/cloudflare';

type RuntimeEnv = Record<string, unknown>;

export function getRuntimeEnvValue(name: string): string | undefined {
  try {
    const env = getCloudflareContext().env as RuntimeEnv;
    const value = env[name];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  } catch {
    // Local Next.js dev and build paths may not have Cloudflare context.
  }

  const fallback = process.env[name];
  return fallback && fallback.length > 0 ? fallback : undefined;
}

export function getRuntimeSupabaseUrl(): string | undefined {
  return getRuntimeEnvValue('NEXT_PUBLIC_SUPABASE_URL');
}

export function getRuntimeSupabaseAnonKey(): string | undefined {
  return getRuntimeEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getRuntimeCanonicalOrigin(requestOrigin: string): string {
  return (
    getRuntimeEnvValue('NEXT_PUBLIC_AUTH_REDIRECT_URL') ||
    getRuntimeEnvValue('NEXT_PUBLIC_SITE_URL') ||
    requestOrigin
  ).replace(/\/$/, '');
}
