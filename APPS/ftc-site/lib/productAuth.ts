import { getGardenCleanersBrandedPath, isGardenCleanersCustomHost } from "@/lib/gardenCleaners";
import { OPS_SITE_URL } from "@/lib/site";

export type ProductKey = "una" | "garden";

export type ProductRole =
  | "una_admin"
  | "una_staff"
  | "una_client"
  | "una_lead"
  | "garden_admin"
  | "garden_staff"
  | "garden_customer";

export type ProductAuthConfig = {
  key: ProductKey;
  brandName: string;
  loginPath: string;
  callbackPath: string;
  adminPath: string;
  staffPath?: string;
  customerPath?: string;
  clientPath?: string;
  dashboardPath: string;
  allowedAdminEmails: string[];
  themeBodyClass: string;
};

const UNA_DEFAULT_ADMIN_EMAILS = ["uby400@gmail.com", "mike.fejiro@gmail.com"];
const GARDEN_DEFAULT_ADMIN_EMAILS = ["uby400@gmail.com", "mike.fejiro@gmail.com"];

function parseEmailList(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export const PRODUCT_AUTH_CONFIG: Record<ProductKey, ProductAuthConfig> = {
  una: {
    key: "una",
    brandName: "Una Labs",
    loginPath: "/login",
    callbackPath: "/auth/callback",
    adminPath: OPS_SITE_URL,
    staffPath: "/products",
    clientPath: "/products",
    dashboardPath: "/products",
    allowedAdminEmails: [
      ...UNA_DEFAULT_ADMIN_EMAILS,
      ...parseEmailList(process.env.NEXT_PUBLIC_UNALABS_ADMIN_EMAILS)
    ],
    themeBodyClass: "brand-una"
  },
  garden: {
    key: "garden",
    brandName: "Garden Cleaners",
    loginPath: "/portal",
    callbackPath: "/auth/callback",
    adminPath: "/portal#admin",
    staffPath: "/portal#staff",
    customerPath: "/portal#customer",
    dashboardPath: "/portal",
    allowedAdminEmails: [
      ...GARDEN_DEFAULT_ADMIN_EMAILS,
      ...parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS)
    ],
    themeBodyClass: "brand-garden"
  }
};

export function getProductAdminEmailSet(product: ProductKey): Set<string> {
  return new Set(PRODUCT_AUTH_CONFIG[product].allowedAdminEmails.map((email) => normalizeEmail(email)));
}

export function isProductAdminEmail(product: ProductKey, email: string | null | undefined): boolean {
  return getProductAdminEmailSet(product).has(normalizeEmail(email));
}

export function resolveProductContext(input: {
  host?: string;
  pathname?: string;
  search?: string;
  productHint?: string | null;
  returnTo?: string | null;
}): ProductKey {
  const hinted = String(input.productHint || "").trim().toLowerCase();
  if (hinted === "una" || hinted === "garden") {
    return hinted;
  }

  const pathname = String(input.pathname || "/").trim();
  const returnTo = String(input.returnTo || "").trim();
  const host = String(input.host || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  if (input.search) {
    try {
      const params = new URLSearchParams(input.search.startsWith("?") ? input.search.slice(1) : input.search);
      const productFromQuery = String(params.get("product") || "").trim().toLowerCase();
      if (productFromQuery === "una" || productFromQuery === "garden") {
        return productFromQuery;
      }
    } catch {
      // Ignore malformed search strings and continue with host/path inference.
    }
  }

  if (isGardenCleanersCustomHost(host)) {
    return "garden";
  }

  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/garden-cleaners" ||
    pathname.startsWith("/garden-cleaners/") ||
    returnTo === "/portal" ||
    returnTo.startsWith("/portal/") ||
    returnTo === "/garden-cleaners" ||
    returnTo.startsWith("/garden-cleaners/")
  ) {
    return "garden";
  }

  return "una";
}

function getGardenPortalPathForHost(host: string): string {
  return getGardenCleanersBrandedPath("/portal", { host });
}

export function buildProductCallbackUrl(input: {
  origin: string;
  product: ProductKey;
  returnTo?: string | null;
}): string {
  const callback = new URL(PRODUCT_AUTH_CONFIG[input.product].callbackPath, input.origin);
  callback.searchParams.set("product", input.product);

  const returnTo = String(input.returnTo || "").trim();
  if (returnTo) {
    callback.searchParams.set("returnTo", returnTo);
  }

  return callback.toString();
}

export function resolveProductRole(product: ProductKey, email: string | null | undefined): ProductRole {
  const normalizedEmail = normalizeEmail(email);

  if (product === "una") {
    if (isProductAdminEmail("una", normalizedEmail)) {
      return "una_admin";
    }

    const unaStaffEmails = parseEmailList(process.env.NEXT_PUBLIC_UNALABS_STAFF_EMAILS);
    if (unaStaffEmails.includes(normalizedEmail)) {
      return "una_staff";
    }

    const unaLeadEmails = parseEmailList(process.env.NEXT_PUBLIC_UNALABS_LEAD_EMAILS);
    if (unaLeadEmails.includes(normalizedEmail)) {
      return "una_lead";
    }

    return "una_client";
  }

  if (isProductAdminEmail("garden", normalizedEmail)) {
    return "garden_admin";
  }

  const gardenStaffEmails = parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS);
  if (gardenStaffEmails.includes(normalizedEmail) || normalizedEmail.endsWith("@gardencleaners.ca")) {
    return "garden_staff";
  }

  return "garden_customer";
}

export function resolveProductDestination(input: {
  product: ProductKey;
  role: ProductRole;
  origin: string;
  host: string;
  returnTo?: string | null;
}): string {
  const normalizedOrigin = String(input.origin || "").trim().replace(/\/+$/, "");
  const normalizedHost = String(input.host || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  const normalizedReturnTo = String(input.returnTo || "").trim();

  if (input.product === "una") {
    if (input.role === "una_admin") {
      return PRODUCT_AUTH_CONFIG.una.adminPath;
    }

    if (normalizedOrigin) {
      return `${normalizedOrigin}${PRODUCT_AUTH_CONFIG.una.dashboardPath}`;
    }

    return PRODUCT_AUTH_CONFIG.una.dashboardPath;
  }

  const gardenPortalPath = getGardenPortalPathForHost(normalizedHost);
  const gardenRolePath =
    input.role === "garden_admin"
      ? `${gardenPortalPath}#admin`
      : input.role === "garden_staff"
        ? `${gardenPortalPath}#staff`
        : `${gardenPortalPath}#customer`;

  if (normalizedOrigin) {
    return `${normalizedOrigin}${gardenRolePath}`;
  }

  if (normalizedReturnTo) {
    return normalizedReturnTo;
  }

  return gardenRolePath;
}
