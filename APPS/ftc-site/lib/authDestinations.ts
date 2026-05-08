import { OPS_SITE_URL, SITE_URL } from "@/lib/site";
import { isSharedAdminEmail } from "@/lib/adminEmails";
import { getGardenCleanersPortalUrl, isGardenCleanersCustomHost } from "@/lib/gardenCleaners";

export function getAdminDashboardUrl(): string {
  return OPS_SITE_URL;
}

export function getDefaultPortalUrl(origin: string): string {
  const fallback = `${SITE_URL}/products`;
  const normalizedOrigin = String(origin || "").trim().replace(/\/+$/, "");

  if (!normalizedOrigin) {
    return fallback;
  }

  try {
    const host = new URL(normalizedOrigin).host;
    if (isGardenCleanersCustomHost(host)) {
      return getGardenCleanersPortalUrl();
    }

    return `${normalizedOrigin}/products`;
  } catch {
    return fallback;
  }
}

export function getPostLoginDestination(email: string | null | undefined, origin: string): string {
  if (isSharedAdminEmail(email)) {
    return getAdminDashboardUrl();
  }

  return getDefaultPortalUrl(origin);
}