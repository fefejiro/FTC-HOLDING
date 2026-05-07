import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@ftc/stats-ledger";
import { getStatsLedger, OG_TRADES_STATS_SOURCE } from "../../../../lib/statsLedger";

export const runtime = "nodejs";

function asString(value: string | null): string | undefined {
  const normalized = (value || "").trim();
  return normalized || undefined;
}

function asLimit(value: string | null): number {
  const num = Number(value || 100);
  if (!Number.isFinite(num)) return 100;
  return Math.max(1, Math.min(500, Math.floor(num)));
}

export async function GET(req: NextRequest) {
  const ledger = getStatsLedger();

  if (!ledger) {
    return NextResponse.json(
      { ok: false, message: "Stats ledger is unavailable. Set STATS_LEDGER_DATABASE_URL." },
      { status: 503 }
    );
  }

  const search = req.nextUrl.searchParams;
  const source = asString(search.get("source")) || OG_TRADES_STATS_SOURCE;
  const eventType = asString(search.get("eventType"));
  const from = asString(search.get("from"));
  const to = asString(search.get("to"));
  const limit = asLimit(search.get("limit"));

  const events = await ledger.query({ source, eventType, from, to, limit });
  const csv = toCsv(events);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=og-trades-stats-${new Date().toISOString().slice(0, 10)}.csv`
    }
  });
}
