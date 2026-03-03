#!/usr/bin/env node

const inputBaseUrl = process.env.SMOKE_BASE_URL || process.argv[2] || "https://peacepad.ca";
const baseUrl = inputBaseUrl.replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function splitSetCookieHeader(headerValue) {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(/,(?=[^;,\s]+=)/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  return splitSetCookieHeader(headers.get("set-cookie"));
}

async function requestJson(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    redirect: "manual",
    ...init,
  });

  const rawText = await response.text();
  let json = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch (error) {
      throw new Error(
        `${init.method || "GET"} ${url} returned non-JSON response (status ${response.status}): ${rawText.slice(0, 200)}`,
      );
    }
  }

  return {
    url,
    response,
    json,
    setCookies: getSetCookieHeaders(response.headers),
  };
}

async function runSmokeTest() {
  console.log(`[Smoke] Base URL: ${baseUrl}`);

  const health = await requestJson("/api/health", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  assert(health.response.ok, `[Smoke] GET /api/health failed with status ${health.response.status}`);
  assert(health.json && typeof health.json === "object", "[Smoke] GET /api/health did not return JSON object");
  console.log("[Smoke] GET /api/health OK");

  const guest = await requestJson("/api/auth/guest", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: "SmokeGuest",
    }),
  });
  assert(guest.response.ok, `[Smoke] POST /api/auth/guest failed with status ${guest.response.status}`);
  console.log("[Smoke] POST /api/auth/guest OK");

  const guestCookie = guest.setCookies.find((cookie) =>
    cookie.toLowerCase().startsWith("peacepad_guest="),
  );
  assert(guestCookie, "[Smoke] Missing Set-Cookie header for peacepad_guest");
  assert(/httponly/i.test(guestCookie), "[Smoke] peacepad_guest cookie is missing HttpOnly");

  const sessionCookieHeader = guestCookie.split(";")[0];
  const session = await requestJson("/api/session", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: sessionCookieHeader,
    },
  });

  assert(session.response.ok, `[Smoke] GET /api/session failed with status ${session.response.status}`);
  assert(
    session.json?.sessionType === "guest" || session.json?.mode === "guest",
    `[Smoke] Expected guest session, got ${JSON.stringify(session.json)}`,
  );
  console.log("[Smoke] GET /api/session OK");

  console.log("[Smoke] PASS: guest auth smoke test completed successfully.");
}

runSmokeTest().catch((error) => {
  console.error("[Smoke] FAIL:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
