import { getProductStatusLabel, type ProductStatus } from "../../lib/productStatus";

interface ProductStatusBadgeProps {
  status: ProductStatus;
  className?: string;
}

export default function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  const label = getProductStatusLabel(status);
  if (!label) return null;

  const classes = ["product-status-badge", className].filter(Boolean).join(" ");
  return <span className={classes}>{label}</span>;
}
