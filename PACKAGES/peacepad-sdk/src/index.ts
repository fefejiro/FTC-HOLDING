export interface PreflightSignal {
  category: "linguistic" | "behavioral" | "contextual" | "pattern";
  code: string;
  weight: number;
  description: string;
}

export interface PreflightSendPolicy {
  allow_send_original: boolean;
  requires_acknowledgement: boolean;
  recommended_action: string;
  pause_minutes: number | null;
}

export interface PreflightResponse {
  conflict_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  signals: PreflightSignal[];
  moderation_flags: string[];
  recommendation: string;
  calm_version: string | null;
  send_policy: PreflightSendPolicy;
  model_or_ruleset_version: {
    contract: string;
    tone_model: string;
    escalation_ruleset: string;
  };
  source: {
    tone: string;
    summary: string;
  };
}

export interface AnalyzeMessageRequest {
  text: string;
  context?: string;
  channel?: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface PeacepadClientOptions {
  baseUrl?: string;
  endpoint?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class PeacepadApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PeacepadApiError";
    this.status = status;
    this.body = body;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertPreflightResponse(payload: unknown): asserts payload is PreflightResponse {
  if (!isRecord(payload)) {
    throw new Error("Invalid preflight response: expected object");
  }

  const requiredKeys = [
    "conflict_score",
    "risk_level",
    "signals",
    "moderation_flags",
    "recommendation",
    "calm_version",
    "send_policy",
    "model_or_ruleset_version",
    "source",
  ];

  for (const key of requiredKeys) {
    if (!(key in payload)) {
      throw new Error(`Invalid preflight response: missing '${key}'`);
    }
  }

  if (typeof payload.conflict_score !== "number") {
    throw new Error("Invalid preflight response: conflict_score must be a number");
  }

  if (typeof payload.risk_level !== "string") {
    throw new Error("Invalid preflight response: risk_level must be a string");
  }

  if (!Array.isArray(payload.signals)) {
    throw new Error("Invalid preflight response: signals must be an array");
  }

  if (!Array.isArray(payload.moderation_flags)) {
    throw new Error("Invalid preflight response: moderation_flags must be an array");
  }

  if (!isRecord(payload.send_policy)) {
    throw new Error("Invalid preflight response: send_policy must be an object");
  }

  if (!isRecord(payload.model_or_ruleset_version)) {
    throw new Error("Invalid preflight response: model_or_ruleset_version must be an object");
  }

  if (!isRecord(payload.source)) {
    throw new Error("Invalid preflight response: source must be an object");
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  const value = (baseUrl || "").trim();
  if (!value) {
    return "";
  }
  return value.replace(/\/+$/, "");
}

export class PeacepadClient {
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly credentials: RequestCredentials;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PeacepadClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.endpoint = options.endpoint || "/api/v1/message/preflight";
    this.credentials = options.credentials || "include";
    this.headers = options.headers || {};

    const impl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);
    if (!impl) {
      throw new Error("No fetch implementation available. Provide fetchImpl in PeacepadClientOptions.");
    }
    this.fetchImpl = impl;
  }

  private urlFor(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (!this.baseUrl) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  async analyzeMessage(input: AnalyzeMessageRequest): Promise<PreflightResponse> {
    if (!input || typeof input.text !== "string" || !input.text.trim()) {
      throw new Error("analyzeMessage requires a non-empty 'text' field");
    }

    const response = await this.fetchImpl(this.urlFor(this.endpoint), {
      method: "POST",
      credentials: this.credentials,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      body: JSON.stringify({
        text: input.text,
        ...(input.context ? { context: input.context } : {}),
        ...(input.channel ? { channel: input.channel } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === "string"
        ? body.message
        : `Preflight request failed with status ${response.status}`;
      throw new PeacepadApiError(message, response.status, body);
    }

    assertPreflightResponse(body);
    return body;
  }

  async rewriteMessage(input: AnalyzeMessageRequest): Promise<string | null> {
    const result = await this.analyzeMessage(input);
    return result.calm_version;
  }
}

export function createPeacepadClient(options: PeacepadClientOptions = {}): PeacepadClient {
  return new PeacepadClient(options);
}

export default {
  PeacepadClient,
  createPeacepadClient,
};
