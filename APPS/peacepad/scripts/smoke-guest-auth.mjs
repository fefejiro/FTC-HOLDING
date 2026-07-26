#!/usr/bin/env node

const inputWebBaseUrl = process.env.SMOKE_BASE_URL || process.argv[2] || "https://peacepad.ca";
const inputApiBaseUrl =
  process.env.SMOKE_API_BASE_URL || process.env.VITE_API_BASE_URL || "https://api.peacepad.ca";
const webBaseUrl = inputWebBaseUrl.replace(/\/+$/, "");
const apiBaseUrl = inputApiBaseUrl.replace(/\/+$/, "");

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

async function requestJson(baseUrl, path, init = {}) {
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
  console.log(`[Smoke] Web Base URL: ${webBaseUrl}`);
  console.log(`[Smoke] API Base URL: ${apiBaseUrl}`);

  const webOnboarding = await fetch(`${webBaseUrl}/onboarding`, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  assert(webOnboarding.status === 200, `[Smoke] GET /onboarding failed with status ${webOnboarding.status}`);
  console.log("[Smoke] GET /onboarding OK");

  const health = await requestJson(apiBaseUrl, "/api/health", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  assert(health.response.ok, `[Smoke] GET /api/health failed with status ${health.response.status}`);
  assert(health.json && typeof health.json === "object", "[Smoke] GET /api/health did not return JSON object");
  console.log("[Smoke] GET /api/health OK");

  const guestWithoutConsent = await requestJson(apiBaseUrl, "/api/auth/guest", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: "SmokeGuest",
    }),
  });
  assert(
    guestWithoutConsent.response.status === 428,
    `[Smoke] Expected consent-free guest creation to return 428, got ${guestWithoutConsent.response.status}`,
  );
  assert(
    guestWithoutConsent.json?.code === "CONSENT_REQUIRED",
    `[Smoke] Expected CONSENT_REQUIRED, got ${JSON.stringify(guestWithoutConsent.json)}`,
  );
  assert(
    !guestWithoutConsent.setCookies.some((cookie) =>
      cookie.toLowerCase().startsWith("peacepad_guest="),
    ),
    "[Smoke] Consent-free guest creation must not set a PeacePad session cookie",
  );
  console.log("[Smoke] POST /api/auth/guest without explicit consent rejected OK");

  const guest = await requestJson(apiBaseUrl, "/api/auth/guest", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: "SmokeGuest",
      hasAcceptedConsent: true,
      aiMessageConsent: false,
      aiCallConsent: false,
    }),
  });
  assert(guest.response.ok, `[Smoke] POST /api/auth/guest failed with status ${guest.response.status}`);
  assert(guest.json?.user?.privacyAccepted === true, "[Smoke] Guest privacy acknowledgement was not stored");
  assert(Boolean(guest.json?.user?.termsAcceptedAt), "[Smoke] Guest Terms acceptance was not stored");
  assert(guest.json?.user?.aiMessageConsent === false, "[Smoke] Optional message AI consent must default off");
  assert(guest.json?.user?.aiCallConsent === false, "[Smoke] Optional call AI consent must default off");
  console.log("[Smoke] POST /api/auth/guest with explicit consent OK");

  const guestCookie = guest.setCookies.find((cookie) =>
    cookie.toLowerCase().startsWith("peacepad_guest="),
  );
  assert(guestCookie, "[Smoke] Missing Set-Cookie header for peacepad_guest");
  assert(/httponly/i.test(guestCookie), "[Smoke] peacepad_guest cookie is missing HttpOnly");

  const sessionCookieHeader = guestCookie.split(";")[0];
  const session = await requestJson(apiBaseUrl, "/api/session", {
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

  const deleted = await requestJson(apiBaseUrl, "/api/user/account", {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: sessionCookieHeader,
    },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  assert(
    deleted.response.ok && deleted.json?.success === true,
    `[Smoke] DELETE /api/user/account failed with status ${deleted.response.status}`,
  );

  const deletedSession = await requestJson(apiBaseUrl, "/api/auth/user", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: sessionCookieHeader,
    },
  });
  assert(
    deletedSession.response.status === 401,
    `[Smoke] Deleted guest session remained usable with status ${deletedSession.response.status}`,
  );
  console.log("[Smoke] DELETE /api/user/account and session invalidation OK");

  console.log("[Smoke] PASS: guest consent, auth, and deletion smoke test completed successfully.");
}

runSmokeTest().catch((error) => {
  console.error("[Smoke] FAIL:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
