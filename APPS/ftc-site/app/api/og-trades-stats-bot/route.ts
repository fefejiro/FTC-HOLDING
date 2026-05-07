import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../lib/logger";
import { getStatsLedger, OG_TRADES_STATS_SOURCE } from "../../../lib/statsLedger";

export const runtime = "nodejs";

type StatsEventPayload = {
  idempotencyKey?: unknown;
  source?: unknown;
  eventType?: unknown;
  actorId?: unknown;
  value?: unknown;
  metadata?: unknown;
  occurredAt?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const ledger = getStatsLedger();

  if (!ledger) {
    return NextResponse.json(
      { ok: false, message: "Stats ledger is unavailable. Set STATS_LEDGER_DATABASE_URL." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as StatsEventPayload;
  const eventType = asString(body.eventType);

  if (!eventType) {
    return NextResponse.json({ ok: false, message: "eventType is required." }, { status: 400 });
  }

  const idempotencyKey =
    asString(body.idempotencyKey) ||
    asString(req.headers.get("x-idempotency-key")) ||
    crypto.randomUUID();

  try {
    const event = await ledger.record({
      idempotencyKey,
      source: asString(body.source) || OG_TRADES_STATS_SOURCE,
      eventType,
      actorId: asString(body.actorId) || null,
      value: asNumber(body.value),
      metadata: typeof body.metadata === "object" && body.metadata !== null ? (body.metadata as Record<string, unknown>) : {},
      occurredAt: asString(body.occurredAt) || undefined
    });

    return NextResponse.json({ ok: true, event }, { status: 200 });
  } catch (error) {
    logger.error("og_trades_stats_event_failed", {
      message: error instanceof Error ? error.message : "unknown",
      eventType,
      idempotencyKey
    });

    return NextResponse.json({ ok: false, message: "Unable to record event." }, { status: 500 });
  }
}
