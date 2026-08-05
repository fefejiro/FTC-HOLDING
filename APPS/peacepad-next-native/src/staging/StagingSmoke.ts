export function stagingSmokeBaseUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("PEACEPAD_STAGING_SMOKE_URL must be a valid URL."); }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  const isolated = url.protocol === "https:" && url.hostname.endsWith(".staging.peacepad.ca");
  if ((!local && !isolated) || url.username || url.password || url.search || url.hash) {
    throw new Error("The smoke target must be localhost or an isolated PeacePad staging HTTPS origin.");
  }
  return url.origin;
}

export async function smokeStagingReadiness(baseUrl: string, request: typeof fetch = fetch) {
  const origin = stagingSmokeBaseUrl(baseUrl);
  for (const path of ["/health", "/readyz"] as const) {
    const response = await request(`${origin}${path}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}.`);
    const body = await response.json() as { status?: unknown; service?: unknown };
    if (body.service !== "peacepad-native-staging" || (path === "/health" ? body.status !== "ok" : body.status !== "ready")) {
      throw new Error(`${path} returned an unexpected staging response.`);
    }
  }
}
