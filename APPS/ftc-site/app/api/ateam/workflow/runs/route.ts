import { proxyOrFallbackAteamJson } from "../../../../../lib/ateamUpstream";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search ? url.search : "";
  return proxyOrFallbackAteamJson(req, `/api/workflow/runs${qs}`);
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyOrFallbackAteamJson(req, "/api/workflow/runs", {
    method: "POST",
    body
  });
}
