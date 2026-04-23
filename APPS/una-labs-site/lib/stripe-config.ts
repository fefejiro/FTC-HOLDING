// Worker URL: set NEXT_PUBLIC_STRIPE_API_URL env var to override.
// After deploying the una-stripe-api worker, update the fallback URL below.
export const STRIPE_API_URL =
  process.env.NEXT_PUBLIC_STRIPE_API_URL ?? 'https://una-stripe-api.fejiro-efiuvwere.workers.dev';

export function getStripeApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${STRIPE_API_URL}${normalizedPath}`;
}
