import "server-only";

import { headers } from "next/headers";

function normalizeHost(host = "") {
  return String(host || "").trim().toLowerCase();
}

export function getRequestHost() {
  const requestHeaders = headers();
  return normalizeHost(
    requestHeaders.get("x-request-host") ||
      requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      ""
  );
}

