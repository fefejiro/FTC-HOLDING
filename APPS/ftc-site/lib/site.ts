const DEFAULT_SITE_URL = "https://unalabs.cloud";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.UNALABS_SITE_URL ||
  process.env.FTC_SITE_URL ||
  DEFAULT_SITE_URL;

export const SITE_URL = configuredSiteUrl.replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host.toLowerCase();

export const LEGACY_CANONICAL_HOSTS = (
  process.env.UNALABS_REDIRECT_FROM_HOSTS || process.env.FTC_REDIRECT_FROM_HOSTS || ""
)
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
