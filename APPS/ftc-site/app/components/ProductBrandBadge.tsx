import Image from "next/image";
import type { ProductCardLogo } from "../../lib/productCardBranding";

interface ProductBrandBadgeProps {
  logo: ProductCardLogo;
}

export default function ProductBrandBadge({ logo }: ProductBrandBadgeProps) {
  return (
    <div className="product-brand-badge">
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
