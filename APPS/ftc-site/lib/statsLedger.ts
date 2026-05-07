import { createStatsLedger, type StatsLedgerClient } from "@ftc/stats-ledger";

let cachedLedger: StatsLedgerClient | null = null;

export const OG_TRADES_STATS_SOURCE = "og-trades-stats-bot";

export function getStatsLedger(): StatsLedgerClient | null {
  const connectionString = process.env.STATS_LEDGER_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!cachedLedger) {
    cachedLedger = createStatsLedger({ connectionString });
  }

  return cachedLedger;
}
