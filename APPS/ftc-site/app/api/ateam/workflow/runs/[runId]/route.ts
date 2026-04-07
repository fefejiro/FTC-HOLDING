import { proxyOrFallbackAteamJson } from "../../../../../../lib/ateamUpstream";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: { runId: string } }) {
  const runId = encodeURIComponent(String(context.params.runId || "").trim());
  return proxyOrFallbackAteamJson(_req, `/api/workflow/runs/${runId}`);
}
