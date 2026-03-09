import crypto from "crypto";

export const CAPABILITY_CONTRACT_VERSION_DEFAULT =
  String(process.env.ATEAM_CAPABILITY_CONTRACT_VERSION || "v1alpha1").trim() || "v1alpha1";
export const CAPABILITY_CONTRACT_HEADER = "x-ateam-contract-version";
export const CAPABILITY_REQUEST_ID_HEADER = "x-request-id";

function randomRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value, max = 120) {
  return String(value || "")
    .trim()
    .replace(/[^\w\-.:/]/g, "_")
    .slice(0, max);
}

export function resolveContractVersion(req, body = {}) {
  const bodyVersion = cleanString(body?.contractVersion, 40);
  const headerVersion = cleanString(req?.headers?.[CAPABILITY_CONTRACT_HEADER], 40);
  return bodyVersion || headerVersion || CAPABILITY_CONTRACT_VERSION_DEFAULT;
}

export function resolveRequestId(req, body = {}) {
  const bodyId = cleanString(body?.requestId, 120);
  const headerId = cleanString(req?.headers?.[CAPABILITY_REQUEST_ID_HEADER], 120);
  return bodyId || headerId || randomRequestId();
}

function normalizeScopeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const tenantId = cleanString(value.tenant_id || value.tenantId, 80);
  const workspaceId = cleanString(value.workspace_id || value.workspaceId, 80);
  const userId = cleanString(value.user_id || value.userId, 80);
  const role = cleanString(value.role, 80);
  return {
    tenant_id: tenantId || null,
    workspace_id: workspaceId || null,
    user_id: userId || null,
    role: role || null
  };
}

export function resolveScope(req, body = {}) {
  const bodyScope = normalizeScopeObject(body?.scope);
  if (bodyScope && (bodyScope.tenant_id || bodyScope.workspace_id || bodyScope.user_id || bodyScope.role)) {
    return bodyScope;
  }
  const principal = req?.principal || {};
  return {
    tenant_id: cleanString(principal.tenantId, 80) || null,
    workspace_id: cleanString(principal.workspaceId, 80) || null,
    user_id: cleanString(principal.userId, 80) || null,
    role: cleanString(principal.role, 80) || null
  };
}

export function readCapabilityEnvelope(req) {
  const body = req?.body && typeof req.body === "object" ? req.body : {};
  const hasDataEnvelope = body && typeof body.data === "object" && !Array.isArray(body.data);
  const data = hasDataEnvelope ? body.data : body;
  const requestId = resolveRequestId(req, body);
  const contractVersion = resolveContractVersion(req, body);
  const scope = resolveScope(req, body);
  return {
    requestId,
    contractVersion,
    scope,
    data
  };
}

export function capabilityOk(res, envelope, payload = {}, status = 200) {
  const requestId = envelope?.requestId || randomRequestId();
  const contractVersion = envelope?.contractVersion || CAPABILITY_CONTRACT_VERSION_DEFAULT;
  res.setHeader(CAPABILITY_REQUEST_ID_HEADER, requestId);
  res.setHeader(CAPABILITY_CONTRACT_HEADER, contractVersion);
  return res.status(status).json({
    ok: true,
    requestId,
    contractVersion,
    scope: envelope?.scope || null,
    ...payload
  });
}

export function capabilityError(res, envelope, { status = 500, error = "internal_error", details = null, code = "" } = {}) {
  const requestId = envelope?.requestId || randomRequestId();
  const contractVersion = envelope?.contractVersion || CAPABILITY_CONTRACT_VERSION_DEFAULT;
  res.setHeader(CAPABILITY_REQUEST_ID_HEADER, requestId);
  res.setHeader(CAPABILITY_CONTRACT_HEADER, contractVersion);
  return res.status(status).json({
    ok: false,
    requestId,
    contractVersion,
    error: String(error || "internal_error"),
    details: details == null ? null : String(details),
    code: String(code || "")
  });
}
