import { getStripeApiUrl } from '@/lib/stripe-config';

type PublicAuthConfig = {
  url: string;
  key: string;
};

type AuthRuntimeWindow = Window & {
  __FTC_PUBLIC_SUPABASE_ENV__?: PublicAuthConfig;
  __FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__?: Promise<void>;
};

function isValidPublicAuthConfig(value: unknown): value is PublicAuthConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<PublicAuthConfig>;
  if (typeof config.url !== 'string' || typeof config.key !== 'string' || !config.key.trim()) return false;

  try {
    return new URL(config.url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Loads the public Supabase browser configuration from the Una Labs API.
 * The API deliberately returns only values that are safe to ship to a browser.
 */
export async function ensurePublicAuthRuntimeConfig(): Promise<void> {
  if (typeof window === 'undefined') return;

  const runtime = window as AuthRuntimeWindow;
  if (isValidPublicAuthConfig(runtime.__FTC_PUBLIC_SUPABASE_ENV__)) return;
  if (runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__) {
    return runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__;
  }

  const fetchConfig = async (endpoint: string): Promise<PublicAuthConfig> => {
    const response = await fetch(endpoint, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Public authentication configuration is unavailable.');
    const config: unknown = await response.json();
    if (!isValidPublicAuthConfig(config)) throw new Error('Public authentication configuration is invalid.');
    return config;
  };

  const request = fetchConfig('/api/public-auth-config')
    .catch(() => fetchConfig(getStripeApiUrl('/api/public/auth-config')))
    .then((config) => {
      runtime.__FTC_PUBLIC_SUPABASE_ENV__ = { url: config.url, key: config.key };
    })
    .catch((error) => {
      runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__ = undefined;
      throw error;
    });

  runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__ = request;
  return request;
}

/**
 * Checks that the configured public Auth endpoint is reachable before a visitor
 * leaves Una Labs for an OAuth provider. This prevents a dead configuration from
 * producing an opaque browser navigation failure.
 */
export async function ensurePublicAuthServiceAvailable(): Promise<void> {
  await ensurePublicAuthRuntimeConfig();
  if (typeof window === 'undefined') return;

  const config = (window as AuthRuntimeWindow).__FTC_PUBLIC_SUPABASE_ENV__;
  if (!isValidPublicAuthConfig(config)) {
    throw new Error('Public authentication configuration is unavailable.');
  }

  const response = await fetch(`${config.url}/auth/v1/settings`, {
    method: 'GET',
    headers: { apikey: config.key },
  });
  if (!response.ok) {
    throw new Error('Public authentication service is unavailable.');
  }
}
