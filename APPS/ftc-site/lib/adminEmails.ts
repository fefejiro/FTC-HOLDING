import { type ProductKey, getProductAdminEmailSet, isProductAdminEmail } from "@/lib/productAuth";

export function normalizeAdminEmail(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function getAdminEmailSetForProduct(product: ProductKey): Set<string> {
  return getProductAdminEmailSet(product);
}

export function isAdminEmailForProduct(product: ProductKey, email: string | null | undefined): boolean {
  return isProductAdminEmail(product, email);
}


export function getSharedAdminEmailSet(): Set<string> {
  // Manual merge for ES5 compatibility (no for...of on Set)
  const set = new Set<string>();
  getProductAdminEmailSet("una").forEach((email) => set.add(email));
  getProductAdminEmailSet("garden").forEach((email) => set.add(email));
  return set;
}

export function isSharedAdminEmail(email: string | null | undefined): boolean {
  return getSharedAdminEmailSet().has(normalizeAdminEmail(email));
}