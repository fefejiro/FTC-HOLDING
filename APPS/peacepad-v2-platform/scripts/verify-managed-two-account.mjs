import process from "node:process";
import { randomBytes } from "node:crypto";

const projects = Object.freeze({
  ca: "rohvkyuxbnqzglaromms",
  us: "spmpndalcvwmygznihec",
});
const functionRegions = Object.freeze({
  ca: "ca-central-1",
  us: "us-east-1",
});

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const region = required("PEACEPAD_REGION");
const projectRef = required("PEACEPAD_PROJECT_REF");
const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

if (!(region in projects) || projects[region] !== projectRef) {
  throw new Error("The requested project is not an approved PeacePad fictional-staging target.");
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("The current Supabase publishable key is required.");
}
if (serviceRoleKey.split(".").length !== 3) {
  throw new Error("The Supabase Auth Admin service-role JWT is required.");
}

const origin = `https://${projectRef}.supabase.co`;
const apiOrigin = `${origin}/functions/v1/peacepad-v2-api`;
const runId = randomBytes(8).toString("hex");
const password = `Pp2!${randomBytes(24).toString("base64url")}`;
const accounts = [
  { email: `peacepad-${region}-${runId}-a@example.test`, displayName: "Alex Fictional", token: null, id: null, version: null, deleted: false },
  { email: `peacepad-${region}-${runId}-b@example.test`, displayName: "Jordan Fictional", token: null, id: null, version: null, deleted: false },
];

const safeError = async (response, label) => {
  const payload = await response.json().catch(() => null);
  const detail = payload?.error && typeof payload.error === "object" ? payload.error : payload;
  const code = typeof detail?.code === "string" ? detail.code : "UNSPECIFIED";
  throw new Error(`${label} failed with HTTP ${response.status} (${code}).`);
};

const requestJson = async (url, init, expected, label) => {
  const response = await fetch(url, init);
  if (!expected.includes(response.status)) await safeError(response, label);
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
};

const adminHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

const authHeaders = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
  "Content-Type": "application/json",
};

const createAuthUser = async (account) => {
  const { payload } = await requestJson(`${origin}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName, data_classification: "fictional-only" },
    }),
  }, [200, 201], "Create fictional Auth user");
  if (typeof payload?.id !== "string") throw new Error("Auth user creation returned an invalid receipt.");
  account.id = payload.id;
};

const signIn = async (account) => {
  const { payload } = await requestJson(`${origin}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: account.email, password }),
  }, [200], "Sign in fictional Auth user");
  if (typeof payload?.access_token !== "string" || payload?.user?.id !== account.id) {
    throw new Error("Auth sign-in returned an invalid session receipt.");
  }
  account.token = payload.access_token;
};

const api = async (account, path, { method = "GET", body, key, version, requestedRegion = region, expected = [200] } = {}) => {
  if (!account.token) throw new Error("A fictional authenticated session is required.");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${account.token}`,
    "X-Region": functionRegions[region],
    "X-PeacePad-Region": requestedRegion,
    "X-PeacePad-Schema-Version": "2.0",
  };
  if (key) headers["Idempotency-Key"] = `managed-${runId}-${key}`;
  if (version !== undefined && version !== null) headers["If-Match"] = String(version);
  return requestJson(`${apiOrigin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }, expected, `${method} ${path}`);
};

const write = async (account, path, body, key, version, expected = [200, 201]) =>
  api(account, path, { method: "POST", body, key, version, expected });

const deleteAuthUser = async (account) => {
  if (!account.id) return;
  await requestJson(`${origin}/auth/v1/admin/users/${encodeURIComponent(account.id)}`, {
    method: "DELETE",
    headers: adminHeaders,
  }, [200, 404], "Delete fallback fictional Auth user");
};

const evidence = {
  classification: "fictional-only",
  projectRef,
  region,
  auth: false,
  identityBootstrap: false,
  wrongRegionDenied: false,
  idempotentReplay: false,
  changedReplayDenied: false,
  invitationAccepted: false,
  messageDelivered: false,
  messageCheck: false,
  sharedCalendar: false,
  privateRecords: false,
  callLifecycle: false,
  postEndSignalDenied: false,
  accountDeletion: false,
  oldTokensDenied: false,
};

try {
  for (const account of accounts) {
    await createAuthUser(account);
    await signIn(account);
  }
  evidence.auth = true;

  for (const [index, account] of accounts.entries()) {
    const { payload } = await write(account, "/api/v2/session/bootstrap", { displayName: account.displayName }, `bootstrap-${index}`);
    if (payload?.identityId !== account.id || payload?.region !== region) throw new Error("Identity bootstrap receipt was invalid.");
    const session = await api(account, "/api/v2/session");
    if (session.payload?.actor?.identityId !== account.id || session.payload?.region !== region || !Number.isInteger(session.payload?.actor?.version)) {
      throw new Error("Managed session binding receipt was invalid.");
    }
    account.version = session.payload.actor.version;
  }
  evidence.identityBootstrap = true;

  const wrongRegion = region === "ca" ? "us" : "ca";
  const wrongRegionResult = await api(accounts[0], "/api/v2/consents", {
    method: "POST",
    body: { consentType: "terms", granted: true, policyVersion: "managed-smoke-v1" },
    key: "wrong-region",
    requestedRegion: wrongRegion,
    expected: [409],
  });
  if (wrongRegionResult.payload?.error?.code !== "REGION_MISMATCH") throw new Error("Wrong-region denial receipt was invalid.");
  evidence.wrongRegionDenied = true;

  const familyKey = "family-create";
  const familyBody = { familyName: `Fictional Managed Family ${runId}` };
  const firstFamily = await write(accounts[0], "/api/v2/families", familyBody, familyKey);
  const replayedFamily = await write(accounts[0], "/api/v2/families", familyBody, familyKey);
  const familyId = firstFamily.payload?.familyId;
  if (typeof familyId !== "string" || replayedFamily.payload?.familyId !== familyId) throw new Error("Idempotent family replay was invalid.");
  evidence.idempotentReplay = true;

  const conflict = await api(accounts[0], "/api/v2/families", {
    method: "POST",
    body: { familyName: `Changed Fictional Family ${runId}` },
    key: familyKey,
    expected: [409],
  });
  if (conflict.payload?.error?.code !== "IDEMPOTENCY_CONFLICT") throw new Error("Changed-request replay was not rejected as an idempotency conflict.");
  evidence.changedReplayDenied = true;

  const invitation = await write(accounts[0], "/api/v2/invitations", {
    familyCircleId: familyId,
    invitedRole: "parent",
    permissions: ["messages", "calendar", "shared-records", "calls"],
    expiresInHours: 24,
  }, "invitation-create");
  const invitationId = invitation.payload?.invitation?.id;
  const invitationCode = invitation.payload?.code;
  if (typeof invitationId !== "string" || !/^[A-Z0-9]{6}$/.test(invitationCode ?? "")) throw new Error("Invitation creation receipt was invalid.");
  const preview = await api(accounts[1], "/api/v2/invitations/resolve", {
    method: "POST",
    body: { code: invitationCode },
  });
  if (preview.payload?.invitationId !== invitationId || !Number.isInteger(preview.payload?.version)) throw new Error("Invitation preview receipt was invalid.");
  const accepted = await write(accounts[1], `/api/v2/invitations/${encodeURIComponent(invitationId)}/accept`, {}, "invitation-accept", preview.payload.version, [200]);
  const conversationId = accepted.payload?.conversation?.id;
  if (accepted.payload?.grant?.familyCircleId !== familyId || typeof conversationId !== "string") throw new Error("Invitation acceptance receipt was invalid.");
  evidence.invitationAccepted = true;

  const message = await write(accounts[0], `/api/v2/conversations/${encodeURIComponent(conversationId)}/messages`, {
    familyCircleId: familyId,
    conversationId,
    body: `Fictional managed message ${runId}`,
  }, "message-send");
  const messageId = message.payload?.id;
  const messages = await api(accounts[1], `/api/v2/conversations/${encodeURIComponent(conversationId)}/messages`);
  if (typeof messageId !== "string" || !Array.isArray(messages.payload) || !messages.payload.some((item) => item.id === messageId)) {
    throw new Error("Managed message delivery receipt was invalid.");
  }
  await write(accounts[1], `/api/v2/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/events`, {
    familyCircleId: familyId,
    conversationId,
    originalMessageEventId: messageId,
    eventType: "viewed",
  }, "message-viewed");
  evidence.messageDelivered = true;

  const defaultMessageCheck = await api(accounts[1], `/api/v2/conversations/${encodeURIComponent(conversationId)}/message-check`);
  if (defaultMessageCheck.payload?.enabled !== false || defaultMessageCheck.payload?.aiAssistanceEnabled !== false
    || defaultMessageCheck.payload?.version !== 0) {
    throw new Error("Default-off Message Check receipt was invalid.");
  }
  const enabledMessageCheck = await api(accounts[1], `/api/v2/conversations/${encodeURIComponent(conversationId)}/message-check`, {
    method: "PUT",
    body: { enabled: true, aiAssistanceEnabled: false },
    key: "message-check-enable",
    version: 0,
    expected: [200],
  });
  if (enabledMessageCheck.payload?.enabled !== true || enabledMessageCheck.payload?.aiAssistanceEnabled !== false) {
    throw new Error("Message Check opt-in receipt was invalid.");
  }
  const messagePreview = await api(accounts[1], "/api/v2/message-previews", {
    method: "POST",
    body: { conversationId, content: "Please confirm the fictional pickup time." },
    expected: [200],
  });
  if (messagePreview.payload?.originalMessage !== "Please confirm the fictional pickup time." || typeof messagePreview.payload?.tone !== "string") {
    throw new Error("Authorized Message Check preview receipt was invalid.");
  }
  evidence.messageCheck = true;

  const layer = await write(accounts[0], "/api/v2/calendar-layers", {
    familyCircleId: familyId,
    name: `Fictional shared schedule ${runId}`,
    kind: "events-activities",
    icon: "calendar",
    colorToken: "violet",
    visibility: { scope: "family" },
  }, "calendar-layer-create");
  const layerId = layer.payload?.id;
  if (typeof layerId !== "string" || !Number.isInteger(layer.payload?.version)) throw new Error("Calendar layer receipt was invalid.");
  const event = await write(accounts[0], "/api/v2/schedule-events", {
    familyCircleId: familyId,
    calendarLayerId: layerId,
    childProfileIds: [],
    eventType: "appointment",
    title: `Fictional managed appointment ${runId}`,
    description: null,
    startsAt: "2026-09-01T15:00:00.000Z",
    endsAt: "2026-09-01T16:00:00.000Z",
    status: "planned",
    recurrence: null,
    visibilityOverride: null,
  }, "calendar-event-create");
  const eventId = event.payload?.id;
  const visibleEvents = await api(accounts[1], `/api/v2/schedule-events?familyCircleId=${encodeURIComponent(familyId)}`);
  if (typeof eventId !== "string" || !Array.isArray(visibleEvents.payload) || !visibleEvents.payload.some((item) => item.id === eventId)) {
    throw new Error("Shared Calendar visibility receipt was invalid.");
  }
  evidence.sharedCalendar = true;

  const binder = await write(accounts[0], "/api/v2/case-binders", {
    familyCircleId: familyId,
    name: `Fictional private records ${runId}`,
    childLabel: "Child F",
  }, "case-binder-create");
  const binderId = binder.payload?.id;
  if (typeof binderId !== "string" || !Number.isInteger(binder.payload?.version)) throw new Error("Private Case Binder receipt was invalid.");
  const otherBinders = await api(accounts[1], `/api/v2/case-binders?familyCircleId=${encodeURIComponent(familyId)}`);
  if (!Array.isArray(otherBinders.payload) || otherBinders.payload.some((item) => item.id === binderId)) {
    throw new Error("Private Case Binder was visible to the other family participant.");
  }
  const attachment = await write(accounts[0], "/api/v2/attachment-upload-intents", {
    familyCircleId: familyId,
    target: { kind: "private-binder", binderId },
    originalFileName: "fictional-note.txt",
    mediaType: "text/plain",
    byteLength: 128,
  }, "attachment-intent-create");
  if (attachment.payload?.uploadTransport !== "disabled" || attachment.payload?.uploadUrl !== null) {
    throw new Error("Metadata-only attachment boundary receipt was invalid.");
  }
  const timelineEntry = await write(accounts[0], "/api/v2/timeline-entries", {
    familyCircleId: familyId,
    caseBinderId: binderId,
    sourceKind: "message-event",
    sourceId: messageId,
  }, "timeline-entry-create");
  const serializedTimelineEntry = JSON.stringify(timelineEntry.payload);
  if (timelineEntry.payload?.source?.sourceId !== messageId || serializedTimelineEntry.includes(`Fictional managed message ${runId}`)) {
    throw new Error("Metadata-only private timeline receipt was invalid.");
  }
  evidence.privateRecords = true;

  const createdCall = await write(accounts[0], "/api/v2/calls", { conversationId }, "call-create");
  const callId = createdCall.payload?.id;
  const callVersion = createdCall.payload?.version;
  if (typeof callId !== "string" || !Number.isInteger(callVersion)) throw new Error("Call creation receipt was invalid.");
  const acceptedCall = await write(accounts[1], `/api/v2/calls/${encodeURIComponent(callId)}/accept`, {}, "call-accept", callVersion, [200]);
  if (acceptedCall.payload?.status !== "active" || !Number.isInteger(acceptedCall.payload?.version)) throw new Error("Call acceptance receipt was invalid.");
  const endedCall = await write(accounts[0], `/api/v2/calls/${encodeURIComponent(callId)}/end`, {}, "call-end", acceptedCall.payload.version, [200]);
  if (endedCall.payload?.status !== "ended" || !Number.isInteger(endedCall.payload?.version)) throw new Error("Call end receipt was invalid.");
  evidence.callLifecycle = true;

  const deniedSignal = await api(accounts[0], `/api/v2/calls/${encodeURIComponent(callId)}/signals`, {
    method: "POST",
    body: { kind: "offer", payload: { sdp: "v=0\r\no=fictional-managed-smoke" } },
    version: endedCall.payload.version,
    expected: [403, 409],
  });
  if (!deniedSignal.payload?.error?.code) throw new Error("Post-end signaling denial receipt was invalid.");
  evidence.postEndSignalDenied = true;

  const ownerDeletion = await api(accounts[0], "/api/v2/account", {
    method: "DELETE", key: "delete-a", version: accounts[0].version, expected: [200],
  });
  if (ownerDeletion.payload?.status !== "deleted" || ownerDeletion.payload?.identityId !== accounts[0].id) {
    throw new Error("Owner account deletion receipt was invalid.");
  }
  accounts[0].deleted = true;

  const removedOwnerBinders = await api(accounts[1], `/api/v2/case-binders?familyCircleId=${encodeURIComponent(familyId)}`);
  if (!Array.isArray(removedOwnerBinders.payload) || removedOwnerBinders.payload.some((item) => item.id === binderId)) {
    throw new Error("Deleted-owner private records cleanup receipt was invalid.");
  }
  const participantDeletion = await api(accounts[1], "/api/v2/account", {
    method: "DELETE", key: "delete-b", version: accounts[1].version, expected: [200],
  });
  if (participantDeletion.payload?.status !== "deleted" || participantDeletion.payload?.identityId !== accounts[1].id) {
    throw new Error("Participant account deletion receipt was invalid.");
  }
  accounts[1].deleted = true;
  evidence.accountDeletion = true;

  for (const account of accounts) {
    const denied = await api(account, "/api/v2/session", { expected: [401] });
    if (denied.payload?.error?.code !== "AUTH_REQUIRED") throw new Error("Deleted-account token was not rejected.");
  }
  evidence.oldTokensDenied = true;

  process.stdout.write(`${JSON.stringify(evidence)}\n`);
} finally {
  for (const account of accounts) {
    if (!account.deleted) {
      if (account.token && Number.isInteger(account.version)) {
        await api(account, "/api/v2/account", {
          method: "DELETE",
          key: `fallback-delete-${account === accounts[0] ? "a" : "b"}`,
          version: account.version,
          expected: [200, 401, 409],
        }).catch(() => null);
      }
      await deleteAuthUser(account).catch(() => null);
    }
  }
}
