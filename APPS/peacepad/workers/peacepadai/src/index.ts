export interface Env {
  // Reserved for future bindings.
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "HEAD") {
      return new Response(null, { status: 200 });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        worker: "peacepadai",
        ts: new Date().toISOString(),
      });
    }

    return Response.json({
      worker: "peacepadai",
      message: "Cloudflare Worker is deployed",
    });
  },
};
