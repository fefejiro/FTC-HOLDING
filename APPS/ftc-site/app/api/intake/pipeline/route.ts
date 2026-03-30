import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../lib/logger";

export const runtime = "edge";

const PIPELINE_EVENT_TYPES = new Set([
  "lead_qualified",
  "call_booked",
  "proposal_sent",
  "project_closed_won",
  "project_closed_lost"
]);

type PipelinePayload = {
  requestId?: unknown;
  eventType?: unknown;
  owner?: unknown;
  notes?: unknown;
  value?: unknown;
  engagementType?: unknown;
  leadSource?: unknown;
  bookedFor?: unknown;
  proposalId?: unknown;
  metadata?: unknown;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, message }, { status: 401 });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSecret(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return normalizeText(req.headers.get("x-unalabs-pipeline-key"));
}

function hasInternalAccess(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const accessJwt = normalizeText(req.headers.get("cf-access-jwt-assertion"));
  return accessJwt.length > 0;
}

function parseValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const configuredSecret = normalizeText(process.env.UNALABS_PIPELINE_API_KEY);
  const providedSecret = readSecret(req);
  const internalAccess = hasInternalAccess(req);

  if (configuredSecret) {
    if ((!providedSecret || providedSecret !== configuredSecret) && !internalAccess) {
      return unauthorized();
    }
  } else if (process.env.NODE_ENV === "production" && !internalAccess) {
    return badRequest("Pipeline tracking is not configured.", 503);
  }

  let payload: PipelinePayload;
  try {
    payload = (await req.json()) as PipelinePayload;
  } catch {
    return badRequest("Invalid request payload.");
  }

  const requestId = normalizeText(payload.requestId);
  const eventType = normalizeText(payload.eventType);
  const owner = normalizeText(payload.owner);
  const notes = normalizeText(payload.notes);
  const engagementType = normalizeText(payload.engagementType);
  const leadSource = normalizeText(payload.leadSource);
  const bookedFor = normalizeText(payload.bookedFor);
  const proposalId = normalizeText(payload.proposalId);
  const value = parseValue(payload.value);
  const metadata = isPlainObject(payload.metadata) ? payload.metadata : undefined;

  if (!requestId || requestId.length < 8 || requestId.length > 60) {
    return badRequest("Please provide a valid requestId.");
  }

  if (!PIPELINE_EVENT_TYPES.has(eventType)) {
    return badRequest("Please provide a valid eventType.");
  }

  if (owner.length > 80) {
    return badRequest("Owner must stay under 80 characters.");
  }

  if (notes.length > 1200) {
    return badRequest("Notes must stay under 1200 characters.");
  }

  if (engagementType.length > 80 || leadSource.length > 80 || bookedFor.length > 120) {
    return badRequest("One or more pipeline fields are too long.");
  }

  if (proposalId.length > 80) {
    return badRequest("Proposal reference must stay under 80 characters.");
  }

  const pipelineEvent = {
    requestId,
    eventType,
    owner: owner || undefined,
    notes: notes || undefined,
    value: value ?? undefined,
    engagementType: engagementType || undefined,
    leadSource: leadSource || undefined,
    bookedFor: bookedFor || undefined,
    proposalId: proposalId || undefined,
    metadata,
    recordedAt: new Date().toISOString()
  };

  logger.info("pipeline_stage_recorded", pipelineEvent);

  const webhookUrl = normalizeText(process.env.UNALABS_PIPELINE_WEBHOOK_URL);
  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ftc-source": "ftc-site",
          "x-unalabs-source": "unalabs-site",
          "x-unalabs-event-type": eventType
        },
        body: JSON.stringify({
          type: "unalabs_pipeline_stage_event",
          pipelineEvent
        })
      });

      if (!webhookResponse.ok) {
        logger.warn("pipeline_webhook_failed", {
          eventType,
          requestId,
          status: webhookResponse.status
        });
      }
    } catch (error) {
      logger.error("pipeline_webhook_error", {
        eventType,
        requestId,
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Pipeline stage recorded.",
    requestId,
    eventType,
    recordedAt: pipelineEvent.recordedAt
  });
}
