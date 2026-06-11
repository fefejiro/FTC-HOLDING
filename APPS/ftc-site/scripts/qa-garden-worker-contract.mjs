import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = resolve(__dirname, "../public/_worker.js");
const workerSource = await readFile(workerPath, "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`);
const worker = workerModule.default;

const supabaseUrl = "https://garden-contract.supabase.co";
const jobId = "91fd8a90-80c0-4c6f-8988-c6ffd07ead14";
const bucketName = "garden-cleaners-job-attachments";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key"
};

function gardenMessageRequest() {
  return new Request("https://gardencleaners.ca/api/garden-cleaners-job-note", {
    method: "POST",
    headers: {
      authorization: "Bearer client-session-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      job_id: jobId,
      body: "I need more deeper cleaning",
      visibility: "customer_visible",
      attachments: [
        {
          name: "Bushy Bet.png",
          type: "image/png",
          size: 68,
          dataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lzO7sQAAAABJRU5ErkJggg=="
        }
      ]
    })
  });
}

async function runScenario({ storageAvailable }) {
  const calls = [];
  let auditPayload = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || "GET").toUpperCase();
    calls.push({ url, method, body: init.body });

    if (url === `${supabaseUrl}/auth/v1/user`) {
      return Response.json({ id: "client-auth-id", email: "fejiro.efiuvwere@gmail.com" });
    }

    if (url.startsWith(`${supabaseUrl}/rest/v1/garden_cleaners_profiles`)) {
      return Response.json([
        {
          id: "client-profile-id",
          auth_user_id: "client-auth-id",
          email: "fejiro.efiuvwere@gmail.com",
          role: "client",
          is_active: true,
          service_region: "Oshawa"
        }
      ]);
    }

    if (url.startsWith(`${supabaseUrl}/rest/v1/garden_cleaners_jobs`)) {
      return Response.json([
        {
          id: jobId,
          customer_email: "fejiro.efiuvwere@gmail.com",
          staff_profile_id: null
        }
      ]);
    }

    if (url === `${supabaseUrl}/storage/v1/bucket/${bucketName}`) {
      if (!storageAvailable) {
        return Response.json({ message: "storage unavailable in contract test" }, { status: 500 });
      }
      return Response.json({ id: bucketName, name: bucketName, public: false });
    }

    if (url.startsWith(`${supabaseUrl}/storage/v1/object/${bucketName}/${jobId}/`)) {
      return Response.json({ ok: true });
    }

    if (url === `${supabaseUrl}/rest/v1/garden_cleaners_audit_log`) {
      auditPayload = JSON.parse(String(init.body || "[]"));
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: `Unexpected fetch: ${method} ${url}` }, { status: 500 });
  };

  try {
    const response = await worker.fetch(gardenMessageRequest(), env);
    const body = await response.json();
    return { response, body, auditPayload, calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const unavailable = await runScenario({ storageAvailable: false });
assert.equal(unavailable.response.status, 200);
assert.equal(unavailable.body.ok, true);
assert.match(unavailable.body.warning, /Photos could not be uploaded yet/);
assert.equal(unavailable.auditPayload?.[0]?.action, "client_job_message_added");
assert.equal(unavailable.auditPayload?.[0]?.details?.body, "I need more deeper cleaning");
assert.equal(unavailable.auditPayload?.[0]?.details?.attachments?.[0]?.name, "Bushy-Bet.png");
assert.equal(unavailable.auditPayload?.[0]?.details?.attachments?.[0]?.storage_status, "upload_pending");
assert.ok(
  unavailable.calls.some((call) => call.url === `${supabaseUrl}/storage/v1/bucket/${bucketName}`),
  "bucket readiness check should run before recording upload_pending attachment metadata"
);
assert.ok(
  !unavailable.calls.some((call) => call.url.startsWith(`${supabaseUrl}/storage/v1/object/${bucketName}/`)),
  "object upload should not run when bucket readiness fails"
);

const available = await runScenario({ storageAvailable: true });
const uploadCall = available.calls.find((call) => call.url.startsWith(`${supabaseUrl}/storage/v1/object/${bucketName}/${jobId}/`));
assert.equal(available.response.status, 200);
assert.equal(available.body.ok, true);
assert.equal(available.body.warning, undefined);
assert.equal(uploadCall?.method, "POST");
assert.equal(available.auditPayload?.[0]?.action, "client_job_message_added");
assert.equal(available.auditPayload?.[0]?.details?.body, "I need more deeper cleaning");
assert.equal(available.auditPayload?.[0]?.details?.attachments?.[0]?.name, "Bushy-Bet.png");
assert.equal(available.auditPayload?.[0]?.details?.attachments?.[0]?.bucket, bucketName);
assert.match(available.auditPayload?.[0]?.details?.attachments?.[0]?.path, new RegExp(`^${jobId}/\\d+-0-Bushy-Bet\\.png$`));

console.log("[garden-worker-contract] Client message survives storage failure and uses Supabase Storage POST uploads.");
