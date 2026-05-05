import Image from "next/image";
import type { ProductCardLogo } from "../../lib/productCardBranding";

interface ProductBrandBadgeProps {
  logo: ProductCardLogo;
  className?: string;
}

export default function ProductBrandBadge({ logo, className }: ProductBrandBadgeProps) {
  const classes = ["product-brand-badge", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        sizes="(max-width: 640px) 40px, 56px"
        className="product-brand-badge__image"
      />
    </div>
  );
}
