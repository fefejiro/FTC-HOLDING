type EventProperties = Record<string, unknown>;

/**
 * Product analytics are intentionally disabled for the iOS 1.0 release.
 *
 * Keep these stable no-op exports so product code does not need privacy-specific
 * branches and no event can reach a previously configured PostHog destination.
 */
export const ANALYTICS_COLLECTION_ENABLED = false;

export function getAnalyticsDistinctId(): string {
  return "analytics-disabled";
}

export function identifyAnalyticsUser(
  _user:
    | {
        id: string;
        displayName?: string | null;
        isGuest?: boolean;
        sessionCount?: number | null;
        prepChatSessionCount?: number | null;
        distinctDaysActive?: number | null;
        activePartnershipId?: string | null;
      }
    | null
    | undefined,
): void {
  // Disabled for this release.
}

export function resetAnalytics(): void {
  // Disabled for this release.
}

export function trackEvent(
  _event: string,
  _properties: EventProperties = {},
  _distinctId?: string,
): void {
  // Disabled for this release.
}

export function trackSessionStarted(_properties: EventProperties = {}): void {
  // Disabled for this release.
}

export function daysSince(dateValue?: string | Date | null): number | null {
  if (!dateValue) {
    return null;
  }

  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

export function openExternal(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
