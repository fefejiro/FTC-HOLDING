import { getApiUrl } from "@/lib/queryClient";

const GUEST_UPGRADE_INTENT_KEY = "peacepad_guest_upgrade_intent";

interface UpgradeFromGuestResponse {
  code?: string;
  message?: string;
  success?: boolean;
  upgraded?: boolean;
}

export function markGuestUpgradeIntent(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(GUEST_UPGRADE_INTENT_KEY, "true");
}

export function consumeGuestUpgradeIntent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldUpgrade = localStorage.getItem(GUEST_UPGRADE_INTENT_KEY) === "true";
  localStorage.removeItem(GUEST_UPGRADE_INTENT_KEY);
  return shouldUpgrade;
}

export async function upgradeFromGuestSessionIfRequested(): Promise<boolean> {
  const response = await fetch(getApiUrl("/api/auth/upgrade-from-guest"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ confirmUpgrade: true }),
  });

  if (response.ok) {
    return true;
  }

  let body: UpgradeFromGuestResponse | null = null;
  try {
    body = (await response.json()) as UpgradeFromGuestResponse;
  } catch {
    body = null;
  }

  const nonBlockingCodes = new Set([
    "GUEST_SESSION_NOT_FOUND",
    "TRIAL_EXPIRED",
    "UPGRADE_CONFIRMATION_REQUIRED",
  ]);

  if (nonBlockingCodes.has(body?.code || "") || response.status === 401 || response.status === 403) {
    return false;
  }

  const message = body?.message || `Upgrade request failed with status ${response.status}`;
  throw new Error(message);
}
