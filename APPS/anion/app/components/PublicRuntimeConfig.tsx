import { getRuntimeSupabaseAnonKey, getRuntimeSupabaseUrl } from '../lib/runtime-env';

export default function PublicRuntimeConfig() {
  const supabaseUrl = getRuntimeSupabaseUrl() ?? '';
  const supabaseAnonKey = getRuntimeSupabaseAnonKey() ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const config = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  };
  const serialized = JSON.stringify(config).replace(/</g, '\\u003c');

  return (
    <script
      data-testid="anion-public-runtime-config"
      dangerouslySetInnerHTML={{
        __html: `window.__ANION_PUBLIC_CONFIG__=${serialized};`,
      }}
    />
  );
}
