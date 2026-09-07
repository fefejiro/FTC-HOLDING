const UPSTREAM_ORIGIN = "https://ftcpeacepad-production.up.railway.app";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const upstream = new URL(`${UPSTREAM_ORIGIN}${incoming.pathname}${incoming.search}`);

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

    return fetch(upstream, new Request(request, { headers }));
  },
};
