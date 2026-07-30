import type { RequestHandler } from "express";

const ENABLED_VALUES = new Set(["1", "true", "yes"]);

export const LEGACY_CALLING_HTTP_PREFIXES = [
  "/api/call-sessions",
  "/api/calls",
  "/api/scheduled-calls",
  "/api/call-preferences",
  "/api/conch-sessions",
  "/api/call-recordings",
  "/api/webrtc",
  "/uploads/recordings",
];

const LEGACY_CALLING_MESSAGE_TYPES = new Set([
  "join-session",
  "leave-session",
  "offer",
  "answer",
  "ice-candidate",
  "call-start",
  "call-end",
  "ai-listening-consent",
]);

/**
 * The historical calling stack is retained only for local feature archaeology.
 * It can never be enabled in a production process.
 */
export function isLegacyCallingEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (String(env.NODE_ENV || "").trim().toLowerCase() === "production") {
    return false;
  }

  return ENABLED_VALUES.has(
    String(env.PEACEPAD_ENABLE_LEGACY_CALLING || "")
      .trim()
      .toLowerCase(),
  );
}

export function isLegacyCallingMessageType(type: unknown): boolean {
  if (typeof type !== "string") {
    return false;
  }

  return type.startsWith("v2:") || LEGACY_CALLING_MESSAGE_TYPES.has(type);
}

export const rejectDisabledLegacyCalling: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
};
