import { storage } from "./storage";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runGuestSessionCleanup(): Promise<void> {
  try {
    const result = await storage.cleanupExpiredSessions();
    if (
      result.deletedSessions > 0 ||
      result.deletedGuestData > 0 ||
      result.deletedUsageMetrics > 0
    ) {
      console.log(
        `[Guest Cleanup] Removed expired guest data: sessions=${result.deletedSessions}, guestData=${result.deletedGuestData}, usageMetrics=${result.deletedUsageMetrics}`,
      );
    }
  } catch (error) {
    console.error("[Guest Cleanup] Failed to clean expired guest sessions:", error);
  }
}

export function startGuestSessionCleanup(intervalMs: number = DAILY_INTERVAL_MS): void {
  console.log(
    `[Guest Cleanup] Starting guest session cleanup service (runs every ${Math.floor(
      intervalMs / (60 * 60 * 1000),
    )}h)`,
  );

  void runGuestSessionCleanup();
  const timer = setInterval(() => {
    void runGuestSessionCleanup();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
