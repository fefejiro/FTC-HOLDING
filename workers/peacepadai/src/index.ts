import { axiomTransport, createLogger } from "@ftc/logger";

export interface Env {
  AXIOM_TOKEN?: string;
  AXIOM_DATASET?: string;
  AXIOM_DATASET_PEACEPADAI?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get("x-request-id")?.trim() || globalThis.crypto.randomUUID();
    const axiomToken = env.AXIOM_TOKEN?.trim() || "";
    const axiomDataset = env.AXIOM_DATASET_PEACEPADAI?.trim() || env.AXIOM_DATASET?.trim() || "";
    const logger = createLogger("peacepadai-worker", {
      context: { source: "peacepadai-worker" },
      transports: axiomToken && axiomDataset ? [axiomTransport({ token: axiomToken, dataset: axiomDataset })] : [],
    });

    logger.info("worker_request_received", {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
    });

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { "x-request-id": requestId } });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const response = Response.json({
        status: "ok",
        worker: "peacepadai",
        requestId,
        ts: new Date().toISOString(),
      });
      response.headers.set("x-request-id", requestId);
      return response;
    }

    const response = Response.json({
      worker: "peacepadai",
      requestId,
      message: "Cloudflare Worker is deployed",
    });
    response.headers.set("x-request-id", requestId);
    return response;
  },
};
