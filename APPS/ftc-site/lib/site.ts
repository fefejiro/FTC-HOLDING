const DEFAULT_SITE_URL = "https://unalabs.cloud";
const DEFAULT_OPS_SITE_URL = "https://ops.unalabs.cloud";
const DEFAULT_ATEAM_SITE_URL = "https://ateam.unalabs.cloud";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.UNALABS_SITE_URL ||
  process.env.FTC_SITE_URL ||
  DEFAULT_SITE_URL;
const configuredOpsSiteUrl =
  process.env.NEXT_PUBLIC_OPS_SITE_URL ||
  process.env.UNALABS_OPS_SITE_URL ||
  DEFAULT_OPS_SITE_URL;
const configuredAteamSiteUrl =
  process.env.NEXT_PUBLIC_ATEAM_SITE_URL ||
  process.env.UNALABS_ATEAM_SITE_URL ||
  DEFAULT_ATEAM_SITE_URL;

export const SITE_URL = configuredSiteUrl.replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host.toLowerCase();
export const OPS_SITE_URL = configuredOpsSiteUrl.replace(/\/+$/, "");
export const OPS_SITE_HOST = new URL(OPS_SITE_URL).host.toLowerCase();
export const ATEAM_SITE_URL = configuredAteamSiteUrl.replace(/\/+$/, "");
export const ATEAM_SITE_HOST = new URL(ATEAM_SITE_URL).host.toLowerCase();

export const LEGACY_CANONICAL_HOSTS = (
  process.env.UNALABS_REDIRECT_FROM_HOSTS || process.env.FTC_REDIRECT_FROM_HOSTS || ""
)
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
