import { OPS_SITE_URL, SITE_URL } from "@/lib/site";
import {
  type ProductKey,
  resolveProductContext,
  resolveProductDestination,
  resolveProductRole
} from "@/lib/productAuth";

type DestinationOptions = {
  pathname?: string;
  search?: string;
  productHint?: string | null;
  returnTo?: string | null;
};

export function getAdminDashboardUrl(product: ProductKey = "una", origin = SITE_URL): string {
  if (product === "garden") {
    return `${origin.replace(/\/+$/, "")}/portal#admin`;
  }

  return OPS_SITE_URL;
}

export function getDefaultPortalUrl(origin: string): string {
  const fallback = `${SITE_URL}/products`;
  const normalizedOrigin = String(origin || "").trim().replace(/\/+$/, "");

  if (!normalizedOrigin) {
    return fallback;
  }

  return `${normalizedOrigin}/products`;
}

export function getPostLoginDestination(
  email: string | null | undefined,
  origin: string,
  options: DestinationOptions = {}
): string {
  const host = (() => {
    try {
      return new URL(origin).host;
    } catch {
      return "";
    }
  })();

  const product = resolveProductContext({
    host,
    pathname: options.pathname,
    search: options.search,
    productHint: options.productHint,
    returnTo: options.returnTo
  });
  const role = resolveProductRole(product, email);

  return resolveProductDestination({
    product,
    role,
    origin,
    host,
    returnTo: options.returnTo
  });
}