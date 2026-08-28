export const PROJECT_ADMIN_EMAILS = [
  'mike.fejiro@gmail.com',
  'fejiro.efiuvwere@gmail.com',
] as const;

export const PROJECT_STATUSES = ['scoping', 'building', 'live', 'paused'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function isProjectAdminEmail(email?: string | null) {
  return PROJECT_ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase() as (typeof PROJECT_ADMIN_EMAILS)[number]);
}

export function getAteamBaseUrl() {
  const configured = (
    process.env.NEXT_PUBLIC_ATEAM_UPSTREAM_ORIGIN ||
    process.env.ATEAM_UPSTREAM_ORIGIN ||
    ''
  ).replace(/\/+$/, '');

  if (configured) return configured;

  return 'https://ateam-api.unalabs.cloud';
}

export function getAteamEndpoint(pathname: string) {
  const base = getAteamBaseUrl();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return base ? `${base}${normalizedPath}` : '';
}

export function normalizeProjectStatus(status?: string | null): ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus) ? (status as ProjectStatus) : 'scoping';
}
