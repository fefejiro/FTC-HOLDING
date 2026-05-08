import { OPS_SITE_URL } from "@/lib/site";
import { isSharedAdminEmail } from "@/lib/adminEmails";
import { getGardenCleanersPortalUrl } from "@/lib/gardenCleaners";

export function getAdminDashboardUrl(): string {
  return OPS_SITE_URL;
}

export function getDefaultPortalUrl(origin: string): string {
  void origin;
  return getGardenCleanersPortalUrl();
}

export function getPostLoginDestination(email: string | null | undefined, origin: string): string {
  if (isSharedAdminEmail(email)) {
    return getAdminDashboardUrl();
  }

  return getDefaultPortalUrl(origin);
}