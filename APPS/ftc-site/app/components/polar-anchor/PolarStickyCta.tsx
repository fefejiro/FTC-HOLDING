import Link from "next/link";
import { polarAnchorBasePath } from "../../../lib/polarAnchor";

export default function PolarStickyCta() {
  return (
    <div className="polar-sticky-cta" aria-label="Polar Anchor quick actions">
      <div className="polar-sticky-copy">
        <span className="polar-sticky-kicker">Need freight support?</span>
        <strong>Request a quote today.</strong>
      </div>
      <div className="polar-sticky-actions">
        <Link href={`${polarAnchorBasePath}/services`} prefetch={false} className="btn btn-secondary">
          Services
        </Link>
        <Link href={`${polarAnchorBasePath}/quote`} prefetch={false} className="btn btn-primary">
          Request a Quote
        </Link>
      </div>
    </div>
  );
}
