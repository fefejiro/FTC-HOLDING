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

  const request = fetch(getStripeApiUrl('/api/public/auth-config'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('Public authentication configuration is unavailable.');
      const config: unknown = await response.json();
      if (!isValidPublicAuthConfig(config)) throw new Error('Public authentication configuration is invalid.');
      runtime.__FTC_PUBLIC_SUPABASE_ENV__ = { url: config.url, key: config.key };
    })
    .catch((error) => {
      runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__ = undefined;
      throw error;
    });

  runtime.__FTC_PUBLIC_SUPABASE_CONFIG_PROMISE__ = request;
  return request;
}
