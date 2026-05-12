type Env = {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
};

const GARDEN_HOSTS = new Set([
  "gardencleaners.ca",
  "www.gardencleaners.ca",
  "gardencleaners.pages.dev"
]);

const OG_HOSTS = new Set([
  "og.unalabs.cloud",
  "ogtradesacademy.com",
  "www.ogtradesacademy.com",
  "ogtradesacademy.ca",
  "www.ogtradesacademy.ca",
  "og-trades-pages.pages.dev"
]);

const GARDEN_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/services",
  "/contact",
  "/quote"
]);

const OG_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/course",
  "/resources",
  "/community",
  "/contact"
]);

function normalizeHost(host = "") {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function normalizePathname(pathname = "/") {
  const cleaned = `/${String(pathname || "/").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return cleaned === "" ? "/" : cleaned;
}

function stripBasePath(pathname: string, basePath: string) {
  if (pathname === basePath) return "/";
  if (!pathname.startsWith(`${basePath}/`)) return pathname;
  const stripped = pathname.slice(basePath.length);
  return normalizePathname(stripped);
}

function toInternalPath(basePath: string, publicPath: string) {
  return publicPath === "/" ? basePath : `${basePath}${publicPath}`;
}

// Paths that must pass through unmodified on brand hosts (build assets, metadata files).
const PASSTHROUGH_PREFIXES = ["/_next/", "/_assets/", "/assets/", "/static/"];
const PASSTHROUGH_EXACT = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/manifest.webmanifest"
]);
const ASSET_EXTENSION = /\.[a-zA-Z0-9]{2,5}$/;

function isAssetPath(pathname: string) {
  if (PASSTHROUGH_EXACT.has(pathname)) return true;
  for (const prefix of PASSTHROUGH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return ASSET_EXTENSION.test(pathname);
}

function isRuntimePassthroughPath(pathname: string) {
  return pathname.startsWith("/api/") || pathname.startsWith("/auth/");
}

function redirect(request: Request, pathname: string, status = 308) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return Response.redirect(url.toString(), status);
}

function rewrite(request: Request, env: Env, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return env.ASSETS.fetch(new Request(url.toString(), request));
}

function handleGardenHost(request: Request, env: Env, pathname: string) {
  if (
    pathname.startsWith("/og-trades-academy") ||
    pathname.startsWith("/work/og-trades-academy") ||
    pathname.startsWith("/products/og-trades-academy")
  ) {
    return redirect(request, "/", 308);
  }

  if (pathname.startsWith("/products/garden-cleaners") || pathname.startsWith("/work/garden-cleaners")) {
    return redirect(request, "/", 308);
  }

  if (pathname.startsWith("/garden-cleaners")) {
    const cleanPath = stripBasePath(pathname, "/garden-cleaners");
    return redirect(request, cleanPath, 308);
  }

  if (pathname === "/portal") {
    return null;
  }

  if (isRuntimePassthroughPath(pathname)) {
    return null;
  }

  if (GARDEN_PUBLIC_PATHS.has(pathname)) {
    return rewrite(request, env, toInternalPath("/garden-cleaners", pathname));
  }

  if (isAssetPath(pathname)) {
    return null;
  }

  return redirect(request, "/", 308);
}

function handleOgHost(request: Request, env: Env, pathname: string) {
  if (
    pathname.startsWith("/garden-cleaners") ||
    pathname.startsWith("/work/garden-cleaners") ||
    pathname.startsWith("/products/garden-cleaners")
  ) {
    return redirect(request, "/", 308);
  }

  if (pathname.startsWith("/products/og-trades-academy") || pathname.startsWith("/work/og-trades-academy")) {
    return redirect(request, "/", 308);
  }

  if (pathname.startsWith("/og-trades-academy")) {
    const cleanPath = stripBasePath(pathname, "/og-trades-academy");
    return redirect(request, cleanPath, 308);
  }

  if (isRuntimePassthroughPath(pathname)) {
    return null;
  }

  if (OG_PUBLIC_PATHS.has(pathname)) {
    return rewrite(request, env, toInternalPath("/og-trades-academy", pathname));
  }

  if (isAssetPath(pathname)) {
    return null;
  }

  return redirect(request, "/", 308);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const host = normalizeHost(context.request.headers.get("host") || "");
  const pathname = normalizePathname(new URL(context.request.url).pathname);

  if (GARDEN_HOSTS.has(host)) {
    const response = handleGardenHost(context.request, context.env, pathname);
    if (response) return response;
  }

  if (OG_HOSTS.has(host)) {
    const response = handleOgHost(context.request, context.env, pathname);
    if (response) return response;
  }

  return context.next();
};
