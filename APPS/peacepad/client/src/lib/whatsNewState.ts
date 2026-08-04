export const WHATS_NEW_LAST_SEEN_KEY = "lastSeenChangelogVersion";

interface WhatsNewAutoOpenInput {
  lastSeenVersion: string | null;
  latestVersion: string;
}

interface WhatsNewAutoOpenDecision {
  shouldOpen: boolean;
  markSeen: boolean;
}

export function decideWhatsNewAutoOpen({
  lastSeenVersion,
  latestVersion,
}: WhatsNewAutoOpenInput): WhatsNewAutoOpenDecision {
  if (lastSeenVersion === null) {
    return { shouldOpen: false, markSeen: true };
  }

  if (lastSeenVersion === latestVersion) {
    return { shouldOpen: false, markSeen: false };
  }

  return { shouldOpen: true, markSeen: false };
}
