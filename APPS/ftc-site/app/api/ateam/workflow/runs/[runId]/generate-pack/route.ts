import { proxyAteamJson } from "../../../../../../../lib/ateamUpstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: { runId: string } }) {
  const body = await req.text();
  const runId = encodeURIComponent(String(context.params.runId || "").trim());
  return proxyAteamJson(`/api/workflow/runs/${runId}/generate-pack`, {
    method: "POST",
    body
  });
}
