#!/usr/bin/env node

const VALID_EVENTS = new Set([
  "lead_qualified",
  "call_booked",
  "proposal_sent",
  "project_closed_won",
  "project_closed_lost"
]);

function printUsage() {
  console.log(`
Usage:
  node scripts/update-pipeline-stage.mjs --request-id <id> --event <stage> [options]

Required:
  --request-id <id>         Existing intake request id
  --event <stage>           One of:
                            lead_qualified
                            call_booked
                            proposal_sent
                            project_closed_won
                            project_closed_lost

Optional:
  --owner <name>            Owner or operator handling the lead
  --offer <value>           scoped-first-pass | prototype-direction-sprint | build-execution-track
  --source <value>          direct | ateam_workflow | ateam_demo
  --value <number>          Commercial value or proposal amount
  --booked-for <text>       Call date/time label
  --proposal-id <id>        Proposal reference
  --notes <text>            Freeform note
  --base-url <url>          Defaults to UNALABS_PIPELINE_BASE_URL, UNALABS_SITE_URL, or https://unalabs.cloud
  --key <secret>            Defaults to UNALABS_PIPELINE_API_KEY
  --meta key=value          Repeatable metadata entries
  --json                    Print raw JSON response
  --help                    Show this message

Examples:
  npm run pipeline:update -- --request-id UL-20260330-ABC123 --event lead_qualified --owner Mike --offer scoped-first-pass --source ateam_workflow

  npm run pipeline:update -- --request-id UL-20260330-ABC123 --event proposal_sent --proposal-id PROP-014 --value 2500 --notes "Scoped first pass approved"
`.trim());
}

function readArgs(argv) {
  const parsed = {
    metadata: {}
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      parsed.help = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);

    if (key === "json") {
      parsed.json = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    index += 1;

    if (key === "meta") {
      const separator = nextValue.indexOf("=");
      if (separator <= 0) {
        throw new Error(`Metadata must look like key=value. Received: ${nextValue}`);
      }

      const metaKey = nextValue.slice(0, separator).trim();
      const metaValue = nextValue.slice(separator + 1).trim();
      if (!metaKey || !metaValue) {
        throw new Error(`Metadata must look like key=value. Received: ${nextValue}`);
      }
      parsed.metadata[metaKey] = metaValue;
      continue;
    }

    parsed[key] = nextValue;
  }

  return parsed;
}

function normalizeBaseUrl(rawValue) {
  const fallback =
    process.env.UNALABS_PIPELINE_BASE_URL ||
    process.env.UNALABS_SITE_URL ||
    "https://unalabs.cloud";

  const value = String(rawValue || fallback).trim();
  return value.replace(/\/+$/, "");
}

async function main() {
  let args;
  try {
    args = readArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[pipeline-update] ${error instanceof Error ? error.message : "Invalid arguments."}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    printUsage();
    return;
  }

  const requestId = String(args["request-id"] || "").trim();
  const eventType = String(args.event || "").trim();

  if (!requestId) {
    console.error("[pipeline-update] --request-id is required.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!VALID_EVENTS.has(eventType)) {
    console.error("[pipeline-update] --event must be one of the supported stage values.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const baseUrl = normalizeBaseUrl(args["base-url"]);
  const endpoint = `${baseUrl}/api/intake/pipeline`;
  const pipelineKey = String(args.key || process.env.UNALABS_PIPELINE_API_KEY || "").trim();

  const payload = {
    requestId,
    eventType,
    owner: String(args.owner || "").trim() || undefined,
    engagementType: String(args.offer || "").trim() || undefined,
    leadSource: String(args.source || "").trim() || undefined,
    value:
      args.value !== undefined && String(args.value).trim() !== ""
        ? Number(String(args.value).trim())
        : undefined,
    bookedFor: String(args["booked-for"] || "").trim() || undefined,
    proposalId: String(args["proposal-id"] || "").trim() || undefined,
    notes: String(args.notes || "").trim() || undefined,
    metadata:
      Object.keys(args.metadata || {}).length > 0 ? args.metadata : undefined
  };

  if (payload.value !== undefined && !Number.isFinite(payload.value)) {
    console.error("[pipeline-update] --value must be numeric.");
    process.exitCode = 1;
    return;
  }

  const headers = {
    "content-type": "application/json"
  };

  if (pipelineKey) {
    headers.authorization = `Bearer ${pipelineKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = null;
  }

  if (!response.ok) {
    console.error(`[pipeline-update] Request failed (${response.status})`);
    if (responseJson) {
      console.error(JSON.stringify(responseJson, null, 2));
    } else if (responseText) {
      console.error(responseText);
    }
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(responseJson, null, 2));
    return;
  }

  console.log(
    `[pipeline-update] Recorded ${eventType} for ${requestId} at ${responseJson?.recordedAt ?? "unknown time"}`
  );
  if (baseUrl) {
    console.log(`[pipeline-update] Base URL: ${baseUrl}`);
  }
}

main().catch((error) => {
  console.error(`[pipeline-update] ${error instanceof Error ? error.message : "Unknown error."}`);
  process.exitCode = 1;
});
