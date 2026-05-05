export type ProductStatus = "live" | "beta" | "early" | "coming";

export const STATUS_LABELS: Record<Exclude<ProductStatus, "live">, string> = {
  beta: "Private Beta",
  early: "Early Access",
  coming: "Coming Soon"
};

export function getProductStatusLabel(status: ProductStatus): string | null {
  if (status === "live") return null;
  return STATUS_LABELS[status];
}
