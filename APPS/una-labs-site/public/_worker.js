/**
 * Cloudflare Pages runtime configuration bridge.
 * Only the public Supabase browser URL and anon key are made available. All
 * application content remains static and is served by the Pages asset binding.
 */
function publicAuthConfig(env) {
  const url = String(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/public-auth-config') {
      const config = publicAuthConfig(env);
      return new Response(JSON.stringify(config ?? { error: 'Authentication service is temporarily unavailable.' }), {
        status: config ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
